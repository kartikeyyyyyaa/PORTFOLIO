(function(){
  /* ================= THEME ================= */
  var THEME_KEY = 'll-theme';
  function getStoredTheme(){ try { return localStorage.getItem(THEME_KEY); } catch(e){ return null; } }
  function storeTheme(mode){ try { localStorage.setItem(THEME_KEY, mode); } catch(e){} }
  function applyTheme(mode){
    if(mode === 'light' || mode === 'dark'){ document.documentElement.setAttribute('data-theme', mode); }
    else { document.documentElement.removeAttribute('data-theme'); mode = 'system'; }
    storeTheme(mode);
    document.querySelectorAll('.theme-toggle button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
  }
  function initTheme(){
    applyTheme(getStoredTheme() || 'system');
    var toggle = document.getElementById('themeToggle');
    if(toggle){
      toggle.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-mode]');
        if(btn) applyTheme(btn.getAttribute('data-mode'));
      });
    }
  }

  /* ================= DATA ================= */
  var REASONS = [
    {id:'tired', label:'I was tired', msg:"Fatigue talking, not unwillingness. I haven't raised tomorrow's bar — if anything I've kept the later slot open so you're not fighting your own energy curve."},
    {id:'time', label:'No time today', msg:"A time squeeze, not a motivation problem. I've started tracking where your free windows actually are so I can fit tomorrow's session into one that exists."},
    {id:'bored', label:'Got bored / lost interest', msg:"Boredom is a variety problem, not a discipline one. Tomorrow's session comes with a different starting task so it doesn't feel like the same wall."},
    {id:'hard', label:'Too difficult to start', msg:"Difficulty spikes are why people bounce off entirely. I've split tomorrow's target into two shorter sessions so the first one feels small enough to just begin."},
    {id:'forgot', label:'Forgot completely', msg:"A pure memory miss — the easiest kind to fix. I've queued a reminder at the time you're historically most likely to actually act on it."},
    {id:'noidea', label:"Didn't know how to start", msg:"Not knowing where to begin is the most fixable failure mode there is. Tomorrow's session opens with a pre-picked first task — no decision required before you start."},
    {id:'friction', label:'Environment got in the way', msg:"Logged as friction, not failure. Worth prepping your setup the night before — tomorrow's minimum is unchanged, just still the reduced one."}
  ];

  var REWARDS = [
    {id:'refund', label:'Nothing extra — finishing is the win', detail:'Your guardian just gives your money back'},
    {id:'voucher', label:'A partner voucher on top', detail:'A sponsored bookstore / earbuds / gym-pass voucher — funded by that partner, not by anyone’s failure'},
    {id:'coaching', label:'A month of premium coaching', detail:'Unlocks deeper AI coaching once the contract closes'},
    {id:'donate', label:'I donate my own money back', detail:'The returned amount goes straight to a charity you pick, as a personal challenge'}
  ];

  var ACCOUNT = [
    {id:'private', title:'Private', desc:'Only you and the AI see your progress.'},
    {id:'friend', title:'One friend', desc:'A single person is notified only on completion or abandonment — never daily nagging.'},
    {id:'family', title:'Family', desc:'Same as friend, shared with a family member instead.'},
    {id:'community', title:'A small community', desc:'Visible to a group you already belong to — a hostel wing, a study circle.'},
    {id:'public', title:'Public leaderboard', desc:'Ranked publicly by Commitment Score, never by raw pass/fail.'}
  ];

  var RELATIONS = ['Parent','Friend','Sibling','Mentor','Other'];
  var GUARDIAN_OUTCOME = [
    {id:'keep', label:'Keep it — no questions asked'},
    {id:'donate', label:'Donate it to a charity I name'},
    {id:'return', label:'Give it back anyway — this is a soft, no-penalty version'}
  ];

  var RETRIEVAL_QUESTIONS = [
    "In one sentence, what was today's session actually about?",
    "What's the single most important thing you learned or practiced?",
    "Write the one formula, rule, or step you'd forget first if you didn't review it.",
    "What's something you got wrong or struggled with today?",
    "If you had 30 seconds to teach today's material to someone else, what would you say?",
    "What question about this topic can you still not answer confidently?",
    "How does today connect to what you did yesterday?",
    "What's one real situation where you'd actually use this?",
    "What will you do differently tomorrow because of today?",
    "Anything you're tempted to skip reviewing later? Name it now."
  ];

  var s = {
    step:1,
    goal:{what:'Crack GATE — Mechanical Engineering', amount:2, unit:'hrs/day', days:30, importance:8, why:'Career — my GATE score decides my PSU and masters shot'},
    accountability:'private',
    witnessName:'',
    guardian:{name:'', relation:'Parent', amount:1000, outcome:'donate', charityName:'', lockbox:false, lockboxItem:''},
    reward:null,
    cells:[],
    currentDay:0,
    consecutiveMisses:0,
    adapted:false,
    sessionTarget:120,
    comebacks:0,
    log:[],
    reasonCounts:{},
    quizConfidences:[],
    focusSessions:[],
    activeFocus:null,
    abandoned:false,
    completed:false,
    rankScope:'Global'
  };

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function fmtRs(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function esc(str){ var d=document.createElement('div'); d.textContent=str==null?'':str; return d.innerHTML; }

  /* ================= STEPPER ================= */
  var ROMAN = ['I','II','III','IV','V'];
  var STEP_NAMES = ['The Goal','The Witness','The Guardian Hold','The Perk','Signature'];
  function renderStepper(){
    var wrap = document.getElementById('stepper');
    wrap.innerHTML = '';
    for(var i=1;i<=5;i++){
      var d = el('div','step-dot'+(i===s.step?' active':(i<s.step?' done':'')));
      d.innerHTML = '<span class="roman">'+ROMAN[i-1]+'</span><span>'+STEP_NAMES[i-1]+'</span>';
      wrap.appendChild(d);
    }
  }
  function renderStep(){
    renderStepper();
    var card = document.getElementById('stepCard');
    card.innerHTML = '';
    if(s.step===1) card.appendChild(stepGoal());
    if(s.step===2) card.appendChild(stepWitness());
    if(s.step===3) card.appendChild(stepGuardian());
    if(s.step===4) card.appendChild(stepReward());
    if(s.step===5) card.appendChild(stepSign());
  }
  function nav(prevDisabled, onNext, nextLabel){
    var row = el('div','wizard-nav');
    var back = el('button','btn btn-ghost','Back');
    back.disabled = prevDisabled;
    back.onclick = function(){ s.step--; renderStep(); };
    var next = el('button','btn btn-primary', nextLabel || 'Continue');
    next.onclick = onNext;
    row.appendChild(back); row.appendChild(next);
    return row;
  }

  function stepGoal(){
    var f = el('div');
    f.appendChild(el('div','clause-eyebrow','Clause I · 5'));
    f.appendChild(el('h3','clause-title','What are you actually committing to?'));
    f.appendChild(el('p','clause-sub','Vague goals don’t get contracts. Every field below is what turns "I should study more" into something that can be verified.'));

    var row1 = el('div','field');
    row1.innerHTML = '<label>What’s the goal?</label>';
    var whatInput = el('input'); whatInput.type='text'; whatInput.value=s.goal.what;
    whatInput.oninput=function(){s.goal.what=whatInput.value;};
    row1.appendChild(whatInput);
    f.appendChild(row1);

    var row2 = el('div','field-row');
    var c1 = el('div','field'); c1.innerHTML='<label>How much, per day?</label>';
    var amt = el('input'); amt.type='number'; amt.min=1; amt.value=s.goal.amount;
    amt.oninput=function(){s.goal.amount=Number(amt.value)||1; s.sessionTarget = s.goal.amount*60;};
    c1.appendChild(amt);
    c1.appendChild(el('div','hint','hours per day · sets today’s minimum session length'));

    var c2 = el('div','field'); c2.innerHTML='<label>For how long?</label>';
    var days = el('input'); days.type='number'; days.min=7; days.max=90; days.value=s.goal.days;
    days.oninput=function(){s.goal.days=Math.max(7,Math.min(90,Number(days.value)||30));};
    c2.appendChild(days);
    c2.appendChild(el('div','hint','days · many aspirants time this to an exam cycle — GATE, CAT, UPSC prelims'));
    row2.appendChild(c1); row2.appendChild(c2);
    f.appendChild(row2);

    var row3 = el('div','field');
    row3.innerHTML = '<label>Importance <span class="num" id="impVal">'+s.goal.importance+'</span>/10</label>';
    var imp = el('input'); imp.type='range'; imp.min=1; imp.max=10; imp.value=s.goal.importance;
    imp.oninput=function(){ s.goal.importance=Number(imp.value); document.getElementById('impVal').textContent=s.goal.importance; };
    row3.appendChild(imp);
    f.appendChild(row3);

    var row4 = el('div','field');
    row4.innerHTML = '<label>Why does this matter?</label>';
    var why = el('textarea'); why.value = s.goal.why;
    why.oninput=function(){s.goal.why=why.value;};
    row4.appendChild(why);
    f.appendChild(row4);

    s.sessionTarget = s.goal.amount*60;
    f.appendChild(nav(true, function(){ s.step=2; renderStep(); }));
    return f;
  }

  function stepWitness(){
    var f = el('div');
    f.appendChild(el('div','clause-eyebrow','Clause II · 5'));
    f.appendChild(el('h3','clause-title','Who else knows?'));
    f.appendChild(el('p','clause-sub','User-authorized accountability only. Never automatic, never public shaming.'));

    var wrap = el('div');
    ACCOUNT.forEach(function(a){
      var rc = el('label','radio-card'+(s.accountability===a.id?' selected':''));
      rc.innerHTML = '<input type="radio" name="acct"> <div><div class="rc-title">'+a.title+'</div><div class="rc-desc">'+a.desc+'</div></div>';
      rc.querySelector('input').checked = s.accountability===a.id;
      rc.onclick=function(id){ return function(){ s.accountability=id; renderStep(); }; }(a.id);
      wrap.appendChild(rc);
    });
    f.appendChild(wrap);

    if(s.accountability==='friend' || s.accountability==='family'){
      var nf = el('div','field'); nf.style.marginTop='10px';
      nf.innerHTML = '<label>Name (kept local to this demo, not sent anywhere)</label>';
      var ni = el('input'); ni.type='text'; ni.value=s.witnessName; ni.placeholder='e.g. Aisha';
      ni.oninput=function(){s.witnessName=ni.value;};
      nf.appendChild(ni);
      f.appendChild(nf);
    }

    f.appendChild(nav(false, function(){
      if((s.accountability==='friend'||s.accountability==='family') && !s.guardian.name && s.witnessName){
        s.guardian.name = s.witnessName;
        s.guardian.relation = s.accountability==='family' ? 'Parent' : 'Friend';
      }
      s.step=3; renderStep();
    }));
    return f;
  }

  function stepGuardian(){
    var f = el('div');
    f.appendChild(el('div','clause-eyebrow','Clause III · 5'));
    f.appendChild(el('h3','clause-title','The Guardian Hold.'));
    f.appendChild(el('p','clause-sub','This app never touches your money. A person you already trust holds it, outside any app entirely — closer to handing your gym bag to a friend than to a betting platform. That also happens to sidestep India’s 2025 Online Gaming Act, which targets platforms that stake or move money on your behalf; this one never does. See the note at the bottom of the page.'));

    var row = el('div','field-row');
    var c1 = el('div','field'); c1.innerHTML='<label>Their name</label>';
    var gname = el('input'); gname.type='text'; gname.value=s.guardian.name; gname.placeholder='e.g. Mom';
    gname.oninput=function(){s.guardian.name=gname.value;};
    c1.appendChild(gname);

    var c2 = el('div','field'); c2.innerHTML='<label>Relationship</label>';
    var rsel = el('select');
    RELATIONS.forEach(function(r){ var o=el('option'); o.value=r; o.textContent=r; if(r===s.guardian.relation) o.selected=true; rsel.appendChild(o); });
    rsel.onchange=function(){ s.guardian.relation=rsel.value; };
    c2.appendChild(rsel);
    row.appendChild(c1); row.appendChild(c2);
    f.appendChild(row);

    var amtField = el('div','field');
    amtField.innerHTML = '<label>How much are they holding?</label>';
    var chipWrap = el('div','chip-row');
    [100,500,1000,2000,5000].forEach(function(v){
      var c = el('button','chip'+(s.guardian.amount===v?' selected':''), fmtRs(v));
      c.onclick=function(){ s.guardian.amount=v; renderStep(); };
      chipWrap.appendChild(c);
    });
    amtField.appendChild(chipWrap);
    f.appendChild(amtField);

    var outField = el('div','field'); outField.style.marginTop='16px';
    outField.innerHTML = '<label>If I voluntarily abandon this contract, ask them to…</label>';
    GUARDIAN_OUTCOME.forEach(function(o){
      var rc = el('label','radio-card'+(s.guardian.outcome===o.id?' selected':''));
      rc.innerHTML = '<input type="radio" name="gout"> <div><div class="rc-title">'+o.label+'</div></div>';
      rc.querySelector('input').checked = s.guardian.outcome===o.id;
      rc.onclick=function(id){ return function(){ s.guardian.outcome=id; renderStep(); }; }(o.id);
      outField.appendChild(rc);
    });
    f.appendChild(outField);

    if(s.guardian.outcome==='donate'){
      var cf = el('div','field'); cf.style.marginTop='8px';
      cf.innerHTML = '<label>Charity to name</label>';
      var ci = el('input'); ci.type='text'; ci.value=s.guardian.charityName; ci.placeholder='e.g. a cause you already support';
      ci.oninput=function(){s.guardian.charityName=ci.value;};
      cf.appendChild(ci);
      f.appendChild(cf);
    }

    f.appendChild(el('p','hint','Missing a single day never involves your guardian at all — only choosing to abandon the whole contract does, and only in the way you pick above.'));

    var lockField = el('div','field'); lockField.style.marginTop='20px';
    var lockToggle = el('label','radio-card'+(s.guardian.lockbox?' selected':''));
    lockToggle.innerHTML = '<input type="checkbox"> <div><div class="rc-title">Also lock away a temptation item</div><div class="rc-desc">A physical pickup-and-hold — the logistics version of a stake. In production this is a Delhivery pickup at signing, held at a depot, returned on completion.</div></div>';
    lockToggle.querySelector('input').checked = s.guardian.lockbox;
    lockToggle.onclick = function(e){ e.preventDefault(); s.guardian.lockbox = !s.guardian.lockbox; renderStep(); };
    lockField.appendChild(lockToggle);
    if(s.guardian.lockbox){
      var itemF = el('div','field'); itemF.style.marginTop='8px';
      itemF.innerHTML = '<label>What gets picked up?</label>';
      var itemI = el('input'); itemI.type='text'; itemI.value=s.guardian.lockboxItem; itemI.placeholder='e.g. gaming console';
      itemI.oninput=function(){ s.guardian.lockboxItem = itemI.value; };
      itemF.appendChild(itemI);
      lockField.appendChild(itemF);
    }
    f.appendChild(lockField);

    f.appendChild(nav(false, function(){ s.step=4; renderStep(); }));
    return f;
  }

  function stepReward(){
    var f = el('div');
    f.appendChild(el('div','clause-eyebrow','Clause IV · 5'));
    f.appendChild(el('h3','clause-title','What happens when you keep your word?'));
    f.appendChild(el('p','clause-sub','No cash bonuses funded by anyone’s failure — just your money back from your guardian, plus whichever perk you pick.'));
    var wrap = el('div','chip-row');
    REWARDS.forEach(function(r){
      var c = el('button','chip'+((s.reward&&s.reward.id===r.id)?' selected':''));
      c.innerHTML = r.label+'<small>'+r.detail+'</small>';
      c.onclick=function(){ s.reward=r; renderStep(); };
      wrap.appendChild(c);
    });
    f.appendChild(wrap);
    f.appendChild(nav(false, function(){ if(!s.reward){ s.reward=REWARDS[0]; } s.step=5; renderStep(); }));
    return f;
  }

  function witnessPhrase(){
    if(s.accountability==='private') return 'kept private to me and the AI';
    if(s.accountability==='friend') return 'shared with '+(s.witnessName||'one friend')+' on completion or abandonment only';
    if(s.accountability==='family') return 'shared with '+(s.witnessName||'a family member')+' on completion or abandonment only';
    if(s.accountability==='community') return 'visible to my chosen community group';
    return 'ranked publicly by Commitment Score';
  }
  function outcomePhrase(){
    if(s.guardian.outcome==='keep') return 'keep it, no questions asked';
    if(s.guardian.outcome==='donate') return 'donate it to '+(s.guardian.charityName||'a charity I name');
    return 'give it back anyway — this one’s the soft version';
  }

  function buildContractHTML(){
    return 'I, <span class="fill">Kartikeya</span>, commit to <span class="fill">'+esc(s.goal.what)+'</span> — '+
      '<span class="fill">'+s.goal.amount+' '+s.goal.unit+'</span> for <span class="fill">'+s.goal.days+' days</span>, '+
      'rated <span class="fill">'+s.goal.importance+'/10</span> important because <span class="fill">'+esc(s.goal.why||'I said so')+'</span>. '+
      '<span class="fill">'+esc(s.guardian.name||'My guardian')+'</span> ('+s.guardian.relation.toLowerCase()+') is holding <span class="fill">'+fmtRs(s.guardian.amount)+'</span> for me — outside this app entirely. '+
      'If I complete this, they give it back. If I abandon it outright, I’m asking them to <span class="fill">'+outcomePhrase()+'</span>. '+
      'Completing it also gets me <span class="fill">'+(s.reward?s.reward.label.toLowerCase():'my chosen perk')+'</span>. '+
      (s.guardian.lockbox ? 'My <span class="fill">'+esc(s.guardian.lockboxItem||'temptation item')+'</span> is also picked up and held until I finish. ' : '') +
      'Progress is <span class="fill">'+witnessPhrase()+'</span>. '+
      'If I miss a day, the AI investigates why before it does anything else — it does not simply remind me harder.';
  }

  function buildGuardianNotice(inProgress){
    var base = 'Hi '+(s.guardian.name||'there')+' — I’ve committed to "'+s.goal.what+'" for '+s.goal.days+' days'+(inProgress?'':' starting today')+'. '+
      'I’m asking you to hold '+fmtRs(s.guardian.amount)+' for me, outside any app. If I finish, please give it back. '+
      'If I quit outright, please '+outcomePhrase()+'.';
    if(inProgress){
      var sc = computeScore();
      base += ' Quick update: I’m on day '+Math.min(s.currentDay+1,s.goal.days)+' of '+s.goal.days+', with '+
        s.cells.filter(function(c){return c==='done';}).length+' verified days so far and a Commitment Score of '+sc.total+'/1000.';
    } else {
      base += ' I’ll keep you posted as I go — thank you for doing this with me.';
    }
    return base;
  }

  function copyToClipboard(text, btn){
    var done = function(ok){
      var old = btn.textContent;
      btn.textContent = ok ? 'Copied ✓' : 'Copy failed — select manually';
      setTimeout(function(){ btn.textContent = old; }, 1800);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){done(true);}, function(){done(false);});
    } else { done(false); }
  }

  function stepSign(){
    var f = el('div');
    f.appendChild(el('div','clause-eyebrow','Clause V · 5'));
    f.appendChild(el('h3','clause-title','Your contract, generated.'));
    f.appendChild(el('p','clause-sub','Read it back before you sign it — this is what the AI will hold you to.'));

    var text = el('div','contract-text');
    text.innerHTML = buildContractHTML();
    f.appendChild(text);

    var noticeBox = el('div','inline-panel');
    noticeBox.innerHTML = '<h4>Message ready for '+esc(s.guardian.name||'your guardian')+'</h4>';
    var noticeText = el('p','hint'); noticeText.style.fontFamily='var(--font-mono)'; noticeText.style.fontSize='.8rem';
    noticeText.textContent = buildGuardianNotice(false);
    noticeBox.appendChild(noticeText);
    var copyBtn = el('button','btn btn-ghost btn-sm','Copy guardian notice');
    copyBtn.onclick = function(){ copyToClipboard(buildGuardianNotice(false), copyBtn); };
    noticeBox.appendChild(copyBtn);
    f.appendChild(noticeBox);

    var agree = el('label','agree-row'); agree.style.marginTop='16px';
    agree.innerHTML = '<input type="checkbox" id="agreeBox"> <span>I understand a missed day triggers coaching and, if needed, a rescheduled plan — never an automatic penalty, and never involves my guardian. Only I can abandon this contract.</span>';
    f.appendChild(agree);

    var row = el('div','wizard-nav');
    var back = el('button','btn btn-ghost','Back'); back.onclick=function(){s.step=4;renderStep();};
    var sign = el('button','btn btn-primary','Sign &amp; start the ledger');
    sign.onclick=function(){
      var box = document.getElementById('agreeBox');
      if(!box.checked){ box.parentElement.style.color = 'var(--risk)'; return; }
      signContract();
    };
    row.appendChild(back); row.appendChild(sign);
    f.appendChild(row);
    return f;
  }

  /* ================= SIGN & DASHBOARD ================= */
  function signContract(){
    s.cells = new Array(s.goal.days).fill('pending');
    s.log = [{tag:'normal', text:'Contract signed. Day 1 of '+s.goal.days+' starts now — minimum session '+s.sessionTarget+' minutes.'}];
    document.getElementById('setup').hidden = true;
    document.getElementById('dashboard').hidden = false;
    renderDashboard();
  }

  function currentTarget(){ return s.adapted ? Math.round(s.sessionTarget*0.375) : s.sessionTarget; }

  function focusStats(){
    if(!s.focusSessions.length) return null;
    var longest = 0, totalAvg = 0;
    s.focusSessions.forEach(function(fs){ longest = Math.max(longest, fs.longest); totalAvg += fs.avg; });
    return { longest: longest, avg: totalAvg / s.focusSessions.length, n: s.focusSessions.length };
  }

  function computeScore(){
    var acted = 0, done=0;
    s.cells.forEach(function(c){ if(c==='done'){acted++;done++;} if(c==='missed'){acted++;} });
    var completion = acted? done/acted : 0;
    var verifAvg = s._verifSum && done ? (s._verifSum/done) : 0.5;
    var streak = 0, best=0;
    s.cells.forEach(function(c){ if(c==='done'){streak++; best=Math.max(best,streak);} else if(c==='missed'){streak=0;} });
    var streakRatio = Math.min(1, best/s.goal.days);
    var recovery = Math.min(100, s.comebacks*50);
    var fstat = focusStats();
    var focusRatio = fstat ? Math.min(1, fstat.longest/(s.sessionTarget||120)) : 0.5;
    var total = completion*400 + verifAvg*200 + streakRatio*150 + focusRatio*150 + recovery;
    return {completion:completion, verifAvg:verifAvg, streakRatio:streakRatio, focusRatio:focusRatio, recovery:recovery, total:Math.round(Math.min(1000,total))};
  }

  function caseFilePct(){
    var done = s.cells.filter(function(c){return c==='done';}).length;
    return Math.min(100, Math.floor(done/5)*20);
  }

  function logMsg(text, tag){ s.log.unshift({tag:tag||'normal', text:text}); }
  function proofWeight(level, conf){
    if(level==='quiz') return 0.6 + 0.4*((conf||5)/10);
    return level==='connect'?1:(level==='evidence'?0.8:0.5);
  }

  function markDone(level, conf){
    s.cells[s.currentDay] = 'done';
    s._verifSum = (s._verifSum||0) + proofWeight(level, conf);
    var wasRecovering = s.consecutiveMisses>=2;
    s.consecutiveMisses = 0;
    var lvlLabel = level==='connect'?'a connected app':(level==='evidence'?'uploaded evidence':(level==='quiz'?'an AI comprehension check':'a self-report'));
    logMsg('Day '+(s.currentDay+1)+' verified via '+lvlLabel+'.', 'normal');
    if(level==='quiz'){ s.quizConfidences.push(conf); }
    if(wasRecovering){
      s.comebacks++;
      logMsg('Comeback logged after a rough stretch. Recovery bonus applied to your Commitment Score — the AI cares more about what you do next than the miss itself.', 'recovery');
    }
    s.currentDay++;
    afterAction();
  }

  function markMissed(reasonId){
    s.cells[s.currentDay] = 'missed';
    s.consecutiveMisses++;
    var reason = REASONS.filter(function(r){return r.id===reasonId;})[0];
    if(reason){ logMsg(reason.msg, 'normal'); s.reasonCounts[reason.id] = (s.reasonCounts[reason.id]||0)+1; }
    else { logMsg('Day '+(s.currentDay+1)+' missed — no reason logged.', 'normal'); }

    if(s.consecutiveMisses===2 && !s.adapted){
      s.adapted = true;
      var newTarget = Math.round(s.sessionTarget*0.375);
      logMsg('Two misses in a row. Across your logged sessions, completions cluster before 9:00 PM — both misses this week landed after 10:00 PM. This looks like timing, not unwillingness. I’ve moved today’s window earlier and cut the minimum from '+s.sessionTarget+' to '+newTarget+' minutes. Your guardian isn’t involved — this is a reschedule, not a penalty.', 'insight');
    }
    s.currentDay++;
    afterAction();
  }

  function afterAction(){
    ['proofPanel','missPanel','quizPanel'].forEach(function(id){ var e=document.getElementById(id); if(e) e.hidden = true; });
    if(s.currentDay >= s.goal.days){ s.completed = true; }
    renderDashboard();
  }

  function fastForwardMiss(){
    if(s.currentDay >= s.goal.days || s.completed || s.abandoned) return;
    markMissed(null);
    if(s.currentDay < s.goal.days && !s.completed){ markMissed(null); }
  }

  function abandon(){
    s.abandoned = true;
    logMsg('Contract abandoned. I’ve notified '+esc(s.guardian.name||'your guardian')+' to '+outcomePhrase()+', exactly as agreed at signing — this app never touched the money either way.', 'insight');
    renderDashboard();
  }

  /* ---------------- Focus timer ---------------- */
  function fmtMMSS(ms){
    var totalSec = Math.floor(ms/1000);
    var m = Math.floor(totalSec/60), sec = totalSec%60;
    return (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  }
  function startFocus(){
    if(s.activeFocus) return;
    var now = Date.now();
    s.activeFocus = { start: now, segStart: now, segments: [], distractions: 0, tickId: null };
    s.activeFocus._onHide = function(){
      if(document.hidden){
        var seg = Date.now() - s.activeFocus.segStart;
        s.activeFocus.segments.push(seg);
        s.activeFocus.distractions++;
      } else {
        s.activeFocus.segStart = Date.now();
      }
      updateFocusLive();
    };
    document.addEventListener('visibilitychange', s.activeFocus._onHide);
    s.activeFocus.tickId = setInterval(updateFocusLive, 1000);
    renderDashboard();
  }
  function updateFocusLive(){
    if(!s.activeFocus) return;
    var elEl = document.getElementById('focusElapsed');
    var dEl = document.getElementById('focusDistractions');
    if(elEl) elEl.textContent = fmtMMSS(Date.now() - s.activeFocus.start);
    if(dEl) dEl.textContent = s.activeFocus.distractions;
  }
  function stopFocus(){
    if(!s.activeFocus) return;
    var af = s.activeFocus;
    document.removeEventListener('visibilitychange', af._onHide);
    clearInterval(af.tickId);
    var finalSeg = Date.now() - af.segStart;
    af.segments.push(finalSeg);
    var duration = Date.now() - af.start;
    var longest = Math.max.apply(null, af.segments);
    var avg = af.segments.reduce(function(a,b){return a+b;},0)/af.segments.length;
    s.focusSessions.push({ duration:duration, segments:af.segments, distractions:af.distractions, longest:longest, avg:avg });
    s.activeFocus = null;
    renderDashboard();
  }
  function focusSvg(session){
    var w = 560, h = 34;
    var svg = '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" role="img" aria-label="Focus timeline">';
    var x = 0;
    session.segments.forEach(function(seg, i){
      var segW = Math.max(2, (seg/session.duration)*w);
      svg += '<rect x="'+x+'" y="8" width="'+segW+'" height="18" rx="3" fill="var(--success)"></rect>';
      x += segW;
      if(i < session.segments.length-1){
        svg += '<rect x="'+(x-1)+'" y="4" width="3" height="26" fill="var(--risk)"></rect>';
      }
    });
    svg += '</svg>';
    return svg;
  }
  function attentionTrendSvg(sessions){
    var w = 560, h = 90, padBottom = 18, barGap = 6;
    var n = sessions.length;
    var barW = Math.max(10, Math.min(48, (w - barGap*(n-1)) / n));
    var totalW = n*barW + (n-1)*barGap;
    var startX = Math.max(0, (w-totalW)/2);
    var maxMin = Math.max(5, Math.max.apply(null, sessions.map(function(fs){ return fs.longest/60000; })));
    var svg = '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" role="img" aria-label="Attention span trend across sessions">';
    svg += '<line x1="0" y1="'+(h-padBottom)+'" x2="'+w+'" y2="'+(h-padBottom)+'" stroke="var(--border)" stroke-width="1"></line>';
    sessions.forEach(function(fs, i){
      var mins = fs.longest/60000;
      var barH = Math.max(3, (mins/maxMin) * (h-padBottom-10));
      var x = startX + i*(barW+barGap);
      var y = (h-padBottom) - barH;
      svg += '<rect x="'+x+'" y="'+y+'" width="'+barW+'" height="'+barH+'" rx="3" fill="'+(i===n-1?'var(--accent)':'var(--success)')+'"></rect>';
      svg += '<text x="'+(x+barW/2)+'" y="'+(h-4)+'" font-size="9" fill="var(--ink-muted)" text-anchor="middle" font-family="var(--font-mono)">'+(i+1)+'</text>';
    });
    svg += '</svg>';
    return svg;
  }

  /* ---------------- Voice preview (Web Speech API) ---------------- */
  function speakText(text, btn){
    if(!('speechSynthesis' in window)){
      if(btn){ var old=btn.textContent; btn.textContent='Voice not supported here'; setTimeout(function(){btn.textContent=old;},1800); }
      return;
    }
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    var voices = window.speechSynthesis.getVoices();
    var enIN = voices.filter(function(v){ return v.lang === 'en-IN'; })[0];
    if(enIN) utter.voice = enIN;
    utter.rate = 0.98;
    window.speechSynthesis.speak(utter);
  }

  /* ---------------- Debrief ---------------- */
  function buildDebrief(){
    var sc = computeScore();
    var acted = s.cells.filter(function(c){return c!=='pending';}).length;
    if(acted===0) return 'No sessions logged yet — the debrief fills in once you log your first day.';
    var pct = Math.round(sc.completion*100);
    var parts = [];
    parts.push(Math.round(sc.completion*acted)+' of '+acted+' logged days verified so far ('+pct+'%).');
    var topReason = Object.keys(s.reasonCounts).sort(function(a,b){return s.reasonCounts[b]-s.reasonCounts[a];})[0];
    if(topReason){
      var rlabel = REASONS.filter(function(r){return r.id===topReason;})[0].label.toLowerCase();
      parts.push('When you have missed, "'+rlabel+'" has come up most.');
    } else if(acted>0){
      parts.push('No misses logged yet — steady start.');
    }
    var fstat = focusStats();
    if(fstat){
      parts.push('Longest clean focus stretch so far: '+Math.round(fstat.longest/60000)+' min, averaging '+Math.round(fstat.avg/60000)+' min across '+fstat.n+' tracked session'+(fstat.n>1?'s':'')+'.');
    }
    if(s.quizConfidences.length){
      var avgConf = (s.quizConfidences.reduce(function(a,b){return a+b;},0)/s.quizConfidences.length).toFixed(1);
      parts.push('Comprehension checks show '+avgConf+'/10 average confidence in what you’re covering.');
    }
    parts.push(s.adapted ? 'Keep leaning on the adjusted '+currentTarget()+'-minute window — it’s working.' : 'Nothing in the pattern yet suggests you need a change.');
    return parts.join(' ');
  }

  /* ================= DASHBOARD RENDER ================= */
  function renderDashboard(){
    var root = document.getElementById('dashboard');
    root.innerHTML = '';

    if(s.abandoned){
      var t1 = el('div','terminal card');
      t1.innerHTML = '<div class="seal">✕</div><h2>Contract closed.</h2><p>'+esc(s.guardian.name||'Your guardian')+' has been notified to '+outcomePhrase()+' — no surprise fine print, because none was hidden at signing. This app never held the money either way. Your Commitment Score keeps the history rather than erasing it.</p>';
      root.appendChild(t1);
      return;
    }
    if(s.completed){
      var sc0 = computeScore();
      var t2 = el('div','terminal card');
      t2.innerHTML = '<div class="seal">✓</div><h2>Contract complete.</h2><p>'+s.goal.days+' days closed out. Time to send '+esc(s.guardian.name||'your guardian')+' the good news and get your '+fmtRs(s.guardian.amount)+' back, plus '+(s.reward?s.reward.label.toLowerCase():'your reward')+'. Final Commitment Score: <span class="num" style="font-weight:700">'+sc0.total+'</span>/1000.</p>';
      root.appendChild(t2);
      return;
    }

    var top = el('div','dash-top');
    var left = el('div');
    left.innerHTML = '<div class="dash-goal">'+esc(s.goal.what)+'</div><div class="dash-meta">Day <span class="num">'+Math.min(s.currentDay+1,s.goal.days)+'</span> of <span class="num">'+s.goal.days+'</span> · importance '+s.goal.importance+'/10 · '+witnessPhrase()+'</div>';
    var badges = el('div'); badges.style.marginTop='8px';
    if(s.adapted){ badges.appendChild(el('span','badge adapt','⚡ Adaptive plan active — '+currentTarget()+' min sessions, earlier window')); }
    left.appendChild(badges);
    var right = el('div','stake-tile');
    right.innerHTML = '<div class="stake-amt">'+fmtRs(s.guardian.amount)+'</div><div class="stake-label">Held by '+esc(s.guardian.name||'your guardian')+'</div>';
    top.appendChild(left); top.appendChild(right);
    root.appendChild(top);

    // Debrief — full width
    var debriefPanel = el('div','panel');
    debriefPanel.appendChild(el('h3','AI Debrief'));
    debriefPanel.appendChild(el('div','panel-sub','A running read of your pattern, updated after every session.'));
    debriefPanel.appendChild(el('p', null, buildDebrief()));
    root.appendChild(debriefPanel);

    var grid = el('div','dash-grid');
    var ledger = el('div');

    /* --- Ledger --- */
    var panel = el('div','panel');
    panel.appendChild(el('h3','The Ledger'));
    panel.appendChild(el('div','panel-sub','Each cell is one day of the contract.'));
    var legend = el('div','legend');
    legend.innerHTML = '<span><i style="background:var(--success)"></i>Verified</span><span><i style="background:var(--risk)"></i>Missed</span><span><i style="background:var(--pending)"></i>Upcoming</span>';
    panel.appendChild(legend);
    var cal = el('div','calendar');
    s.cells.forEach(function(state, i){
      var c;
      if(i===s.currentDay && !s.completed){
        c = el('button','cell today'); c.title='Today — log it below';
        c.innerHTML = '<span class="dot"></span>';
      } else {
        c = el('div','cell'+(state==='pending'?' future':'')+(state==='done'?' done':'')+(state==='missed'?' missed':''));
        c.title = 'Day '+(i+1)+': '+state;
      }
      cal.appendChild(c);
    });
    panel.appendChild(cal);

    if(s.currentDay < s.goal.days){
      var actions = el('div','action-row');
      var doneBtn = el('button','btn btn-primary btn-sm','Log today’s session');
      doneBtn.onclick = function(){
        document.getElementById('missPanel').hidden = true;
        var pp = document.getElementById('proofPanel');
        pp.hidden = !pp.hidden;
      };
      var missBtn = el('button','btn btn-ghost btn-sm','I couldn’t make it today');
      missBtn.onclick = function(){
        document.getElementById('proofPanel').hidden = true;
        var mp = document.getElementById('missPanel');
        mp.hidden = !mp.hidden;
      };
      actions.appendChild(doneBtn); actions.appendChild(missBtn);
      panel.appendChild(actions);

      var proofPanel = el('div','inline-panel'); proofPanel.id='proofPanel'; proofPanel.hidden = true;
      proofPanel.innerHTML = '<h4>How should this be verified?</h4>';
      var pRow = el('div','chip-row');
      [{id:'self',l:'Self-report (L0)'},{id:'evidence',l:'Upload evidence (L1)'},{id:'connect',l:'Connected app (L2)'},{id:'quiz',l:'AI comprehension check'}].forEach(function(o){
        var c = el('button','chip', o.l);
        c.onclick = function(){
          if(o.id==='quiz'){ document.getElementById('quizPanel').hidden = false; }
          else { markDone(o.id); }
        };
        pRow.appendChild(c);
      });
      proofPanel.appendChild(pRow);
      panel.appendChild(proofPanel);

      var quizPanel = el('div','inline-panel quiz-panel'); quizPanel.id='quizPanel'; quizPanel.hidden = true;
      quizPanel.innerHTML = '<h4>Retrieval check — no right answers here, just honest recall</h4>'+
        '<p class="hint" style="margin-bottom:10px;">In a full build, an LLM grades these against your actual notes. This demo has you self-rate — that’s the honest version of what a static prototype can do.</p>';
      var qList = el('div','quiz-list');
      RETRIEVAL_QUESTIONS.forEach(function(q, i){
        var qf = el('div','field'); qf.style.marginBottom='10px';
        qf.innerHTML = '<label>'+(i+1)+'. '+q+'</label>';
        qf.appendChild(el('input'));
        qList.appendChild(qf);
      });
      quizPanel.appendChild(qList);
      var confField = el('div','field');
      confField.innerHTML = '<label>Confidence in today’s material <span class="num" id="quizConfVal">5</span>/10</label>';
      var confSlider = el('input'); confSlider.type='range'; confSlider.min=1; confSlider.max=10; confSlider.value=5;
      confSlider.oninput=function(){ document.getElementById('quizConfVal').textContent = confSlider.value; };
      confField.appendChild(confSlider);
      quizPanel.appendChild(confField);
      var submitQuiz = el('button','btn btn-primary btn-sm','Submit comprehension check');
      submitQuiz.style.marginTop='8px';
      submitQuiz.onclick = function(){ markDone('quiz', Number(confSlider.value)); };
      quizPanel.appendChild(submitQuiz);
      panel.appendChild(quizPanel);

      var missPanel = el('div','inline-panel'); missPanel.id='missPanel'; missPanel.hidden = true;
      missPanel.innerHTML = '<h4>No penalty for telling the truth — what got in the way?</h4>';
      var mRow = el('div','chip-row');
      REASONS.forEach(function(r){
        var c = el('button','chip', r.label);
        c.onclick = function(){ markMissed(r.id); };
        mRow.appendChild(c);
      });
      var skip = el('button','chip','Skip — just log it');
      skip.onclick = function(){ markMissed(null); };
      mRow.appendChild(skip);
      missPanel.appendChild(mRow);
      panel.appendChild(missPanel);

      var util = el('div','util-row');
      util.innerHTML = '<span class="util-label">Demo controls</span>';
      var ffBtn = el('button','btn btn-ghost btn-sm','⏩ Simulate 2 missed days');
      ffBtn.onclick = fastForwardMiss;
      var abBtn = el('button','btn btn-danger btn-sm','Abandon contract');
      abBtn.onclick = abandon;
      var ur = el('div'); ur.style.display='flex'; ur.style.gap='8px';
      ur.appendChild(ffBtn); ur.appendChild(abBtn);
      util.appendChild(ur);
      panel.appendChild(util);
    }
    ledger.appendChild(panel);

    /* --- Focus timer --- */
    var focusP = el('div','panel');
    focusP.appendChild(el('h3','Focus Timer'));
    focusP.appendChild(el('div','panel-sub','Detects real tab/window switches while this session runs — a working proxy for phone pickups while you study here. True phone Screen Time / Digital Wellbeing data needs a native companion app; a website can’t read that, so this is the honest browser-side version, not a simulation.'));
    if(s.activeFocus){
      var liveRow = el('div'); liveRow.style.display='flex'; liveRow.style.gap='24px'; liveRow.style.alignItems='baseline';
      liveRow.innerHTML = '<div><span class="num" id="focusElapsed" style="font-size:1.4rem;">00:00</span><div class="hint">elapsed</div></div>'+
        '<div><span class="num" id="focusDistractions" style="font-size:1.4rem;">0</span><div class="hint">tab switches</div></div>';
      focusP.appendChild(liveRow);
      var stopBtn = el('button','btn btn-danger btn-sm','Stop session'); stopBtn.style.marginTop='12px';
      stopBtn.onclick = stopFocus;
      focusP.appendChild(stopBtn);
    } else {
      var startBtn = el('button','btn btn-primary btn-sm','Start focus session');
      startBtn.onclick = startFocus;
      focusP.appendChild(startBtn);
      var fstat = focusStats();
      if(fstat){
        focusP.appendChild(el('p','hint', 'Best clean stretch so far: '+Math.round(fstat.longest/60000)+' min · average '+Math.round(fstat.avg/60000)+' min across '+fstat.n+' session'+(fstat.n>1?'s':'')+'.'));
      }
      if(s.focusSessions.length){
        var last = s.focusSessions[s.focusSessions.length-1];
        var chartWrap = el('div'); chartWrap.style.marginTop='10px';
        chartWrap.innerHTML = focusSvg(last);
        focusP.appendChild(chartWrap);
        focusP.appendChild(el('p','hint','Last session: '+fmtMMSS(last.duration)+' total · '+last.distractions+' tab switch'+(last.distractions===1?'':'es')+'.'));

        var trendWrap = el('div'); trendWrap.style.marginTop='18px';
        trendWrap.appendChild(el('div','util-label','Attention span trend — longest clean stretch, per session'));
        var trendChart = el('div'); trendChart.style.marginTop='6px';
        trendChart.innerHTML = attentionTrendSvg(s.focusSessions);
        trendWrap.appendChild(trendChart);
        focusP.appendChild(trendWrap);
      }
    }
    ledger.appendChild(focusP);

    /* --- Case File (was Vault) --- */
    var vp = el('div','panel');
    vp.appendChild(el('h3','The Case File'));
    vp.appendChild(el('div','panel-sub','No money sits in this app — this bar is the evidence trail you can show '+esc(s.guardian.name||'your guardian')+', building 20% every 5 verified days.'));
    var vpct = caseFilePct();
    var track = el('div','vault-bar-track');
    var fill = el('div','vault-bar-fill'); fill.style.width = vpct+'%';
    track.appendChild(fill);
    vp.appendChild(track);
    var vrow = el('div'); vrow.style.display='flex'; vrow.style.justifyContent='space-between'; vrow.style.marginTop='10px';
    vrow.innerHTML = '<span class="vault-pct">'+vpct+'% case built</span><span class="hint">Perk: '+(s.reward?s.reward.label:'—')+'</span>';
    vp.appendChild(vrow);
    var noticeBtn = el('button','btn btn-ghost btn-sm','Copy update for '+esc(s.guardian.name||'guardian'));
    noticeBtn.style.marginTop='12px';
    noticeBtn.onclick = function(){ copyToClipboard(buildGuardianNotice(true), noticeBtn); };
    vp.appendChild(noticeBtn);
    if(s.guardian.lockbox){
      vp.appendChild(el('div','badge adapt', '📦 '+esc(s.guardian.lockboxItem||'Item')+' held by pickup — returns on completion'));
    }
    ledger.appendChild(vp);

    grid.appendChild(ledger);

    /* --- Right column --- */
    var rightCol = el('div');

    var logPanel = el('div','panel');
    logPanel.appendChild(el('h3','The Witness Log'));
    logPanel.appendChild(el('div','panel-sub','What the AI noticed, in order — the speaker plays a real preview of a voice check-in (the Gnani-rail version of this list would just be a call).'));
    var logWrap = el('div','log');
    s.log.forEach(function(item, idx){
      var li = el('div','log-item'+(item.tag!=='normal'?(' '+item.tag):''));
      var tagLabel = item.tag==='insight' ? 'AI · pattern detected' : (item.tag==='recovery' ? 'AI · comeback' : 'AI');
      var content = el('div','log-content');
      content.innerHTML = '<span class="lt-tag">'+tagLabel+'</span>'+item.text;
      li.appendChild(content);
      var speakBtn = el('button','speak-btn', '🔊');
      speakBtn.title = 'Hear this as a voice check-in';
      speakBtn.onclick = function(){ speakText(item.text, speakBtn); };
      li.appendChild(speakBtn);
      logWrap.appendChild(li);
    });
    logPanel.appendChild(logWrap);
    rightCol.appendChild(logPanel);

    var scoreP = el('div','panel');
    scoreP.appendChild(el('h3','Commitment Score'));
    scoreP.appendChild(el('div','panel-sub','Five visible inputs — nothing hidden.'));
    var sc = computeScore();
    var st = el('div','score-total');
    st.innerHTML = '<span class="big num">'+sc.total+'</span><span class="hint">/ 1000</span>';
    scoreP.appendChild(st);
    var sg = el('div','score-grid');
    sg.innerHTML =
      '<span class="k">Completion × 400</span><span class="v">'+Math.round(sc.completion*400)+'</span>'+
      '<span class="k">Verification quality × 200</span><span class="v">'+Math.round(sc.verifAvg*200)+'</span>'+
      '<span class="k">Streak consistency × 150</span><span class="v">'+Math.round(sc.streakRatio*150)+'</span>'+
      '<span class="k">Focus quality × 150</span><span class="v">'+Math.round(sc.focusRatio*150)+'</span>'+
      '<span class="k">Recovery bonus</span><span class="v">'+Math.round(sc.recovery)+'</span>';
    scoreP.appendChild(sg);
    rightCol.appendChild(scoreP);

    var rankP = el('div','panel');
    rankP.appendChild(el('h3','Reputation'));
    rankP.appendChild(el('div','panel-sub','Season 1 · resets in 62 days · demo data, illustrative only.'));
    var tabs = el('div','tabs');
    ['Global','Country','City','College'].forEach(function(scope){
      var tb = el('button','tab'+(s.rankScope===scope?' active':''), scope);
      tb.onclick = function(){ s.rankScope=scope; renderDashboard(); };
      tabs.appendChild(tb);
    });
    rankP.appendChild(tabs);
    var rows = [
      ['1','Ananya R.',941],['2','Devraj S.',887],['3','You',sc.total],['4','Meher K.',612],['5','Ishaan P.',588]
    ].sort(function(a,b){return b[2]-a[2];});
    var table = el('table','rank');
    rows.forEach(function(r, idx){
      var tr = el('tr', r[1]==='You'?'me':'');
      tr.innerHTML = '<td class="rk">'+(idx+1)+'</td><td>'+r[1]+'</td><td class="num" style="text-align:right">'+r[2]+'</td>';
      table.appendChild(tr);
    });
    rankP.appendChild(table);
    if(s.comebacks>0){ rankP.appendChild(el('div','badge adapt','🏆 Comeback Award ×'+s.comebacks)); }
    rightCol.appendChild(rankP);

    grid.appendChild(rightCol);
    root.appendChild(grid);
  }

  initTheme();
  renderStep();
})();
