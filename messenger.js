var firebaseConfig = {
  apiKey: "AIzaSyCiattAZKHvXx_qUwkZRLYjoojLeaYbMm4",
  authDomain: "my-messenger-3d827.firebaseapp.com",
  databaseURL: "https://my-messenger-3d827-default-rtdb.firebaseio.com",
  projectId: "my-messenger-3d827",
  storageBucket: "my-messenger-3d827.firebasestorage.app",
  messagingSenderId: "452001582539",
  appId: "1:452001582539:web:6233a4c49f227e41787a4e"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

var myName = "", myId = "", myEmail = "", myAv = "😊", curChat = "public", curUser = null;
var replyTo = null, selMsg = null, selKey = null, selPath = null, selAv = "😊";
var unread = {}, allUsers = {}, lastSeenRef = null;
var myApprovalCode = localStorage.getItem('app_approval_code') || '';
var myApproved = localStorage.getItem('app_approved') === 'true';

var ADMIN_EMAIL = "neysi@admin.com";
var ADMIN_CODE = "neysi2025";
var isAdmin = localStorage.getItem('app_admin') === 'true';

function isAdminEmail(email) {
    if (!email) return false;
    return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

var avOpts = ['😊','😎','🤓','🥳','😇','🤠','👦','👧','🧑','👨','👩','🧔','👶','🐱','🐶','🦊','🐻','🐼','🦁','🐯','🦄','🐸','🐵','🦉','🌟','⭐','💫','✨','🔥','⚡','🌸','🌹'];
var emos = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😜','🤗','🤔','😐','😑','🙄','😏','😥','😮','😴','😌','😔','😢','😭','😱','😡','😷','👍','👎','👌','✌️','🤞','🤙','👉','👈','👆','👇','✋','🙏','💪','❤️','🧡','💛','💚','💙','💜','💔','💕','💖','🌹','🌟','⭐','✨','🔥','🎉','🎊','🎁','🏆','✅','💎','🌈','☀️','🌙','⚡','🍕','🍔','☕','⚽','🎮','🎵','📱','💻','🚀','🎂','🍰','🐱','🐶','🌸'];
var themes = ['theme-green','theme-blue','theme-purple','theme-red'];

function loadAvPick(){
    var p = document.getElementById('avPick'), h = '';
    avOpts.forEach(function(a){ h += '<span data-av="'+a+'">'+a+'</span>'; });
    p.innerHTML = h;
    p.querySelectorAll('span').forEach(function(s){
        s.onclick = function(){
            p.querySelectorAll('span').forEach(function(x){ x.classList.remove('sel'); });
            s.classList.add('sel'); selAv = s.getAttribute('data-av');
        };
    });
    p.querySelector('span').classList.add('sel');
}
loadAvPick();

var sn = localStorage.getItem('app_name');
if (sn) {
    myName = sn;
    myEmail = localStorage.getItem('app_email') || '';
    myId = localStorage.getItem('app_id') || 'user_' + Date.now();
    myAv = localStorage.getItem('app_av') || '😊';
    if (isAdminEmail(myEmail)) { isAdmin = true; myApproved = true; }
    localStorage.setItem('app_id', myId);
    startApp();
}

document.getElementById('loginBtn').onclick = function(){
    var n = document.getElementById('nameInput').value.trim();
    var e = document.getElementById('emailInput').value.trim();
    if (!n) { alert('اسمت رو وارد کن!'); return; }
    if (!e || !e.includes('@') || !e.includes('.')) { alert('ایمیل معتبر وارد کن'); return; }
    myName = n; myEmail = e; myAv = selAv;
    myId = 'user_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    localStorage.setItem('app_name', n);
    localStorage.setItem('app_email', e);
    localStorage.setItem('app_id', myId);
    localStorage.setItem('app_av', myAv);
    localStorage.removeItem('app_approved');
    localStorage.removeItem('app_approval_code');
    myApproved = false; myApprovalCode = '';
    
    if (isAdminEmail(e)) {
        isAdmin = true; myApproved = true;
        localStorage.setItem('app_admin', 'true');
        localStorage.setItem('app_approved', 'true');
        setTimeout(function(){ alert('✅ خوش آمدی مدیر!'); }, 300);
    }
    startApp();
};

function startApp(){
    document.getElementById('loginScreen').style.display = 'none';
    
    if (isAdminEmail(myEmail)) { isAdmin = true; myApproved = true; }
    
    if (!isAdmin && !myApproved) {
        // منتظر تأیید
        sendApprovalRequest();
        return;
    }
    
    document.getElementById('header').style.display = 'flex';
    document.getElementById('tabs').style.display = 'flex';
    updateAv();
    setOnline();
    loadPubMsgs();
    loadUsers();
    loadGroups();
    loadEmos();
    loadMyCount();
    loadTheme();
    requestNotifPermission();
    cleanupOldMessages();
    listenNotifs();
    checkAdminBtn();
    listenAllEvents();
}

function sendApprovalRequest(){
    if (!myApprovalCode) {
        myApprovalCode = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('app_approval_code', myApprovalCode);
    }
    db.ref('approvals/' + myId).set({
        name: myName, avatar: myAv, email: myEmail,
        code: myApprovalCode, time: Date.now(),
        approved: false, userId: myId
    });
    document.getElementById('waitingScreen').classList.add('show');
}

function verifyMyCode(){
    var inp = document.getElementById('verifyCodeInput').value.trim();
    if (!inp) { alert('کد رو وارد کن'); return; }
    db.ref('approvals/' + myId).once('value', function(snap){
        var a = snap.val();
        if (!a) { alert('❌ درخواستت پیدا نشد'); return; }
        if (a.approvedCode && inp === a.approvedCode) {
            myApproved = true;
            localStorage.setItem('app_approved', 'true');
            document.getElementById('waitingScreen').classList.remove('show');
            alert('🎉 تأیید شدی!');
            startApp();
        } else {
            alert('❌ کد اشتباهه!');
        }
    });
}

function checkApproval(){
    db.ref('approvals/' + myId).once('value', function(snap){
        var a = snap.val();
        if (a && a.approved) {
            myApproved = true;
            localStorage.setItem('app_approved', 'true');
            document.getElementById('waitingScreen').classList.remove('show');
            alert('🎉 تأیید شدی!');
            startApp();
        } else {
            alert('⏳ هنوز تأیید نشدی');
        }
    });
}

function showPendingUsers(){
    db.ref('approvals').once('value', function(snap){
        var d = snap.val() || {};
        var pending = [];
        Object.keys(d).forEach(function(uid){
            if (!d[uid].approved) pending.push({id: uid, data: d[uid]});
        });
        var mb = document.getElementById('mbox');
        var h = '<h3>⏳ کاربران در انتظار (' + pending.length + ')</h3>';
        if (pending.length === 0) {
            h += '<div style="text-align:center;color:#8696a0;padding:30px">هیچ کاربری در انتظار نیست ✅</div>';
        } else {
            pending.sort(function(a,b){ return (a.data.time||0) - (b.data.time||0); });
            pending.forEach(function(p) {
                var u = p.data;
                h += '<div class="pending-user">';
                h += '<div class="row"><div class="u-name">' + u.avatar + ' ' + esc(u.name) + '</div></div>';
                if (u.email) h += '<div class="u-email">📧 ' + esc(u.email) + '</div>';
                h += '<div class="u-time">⏰ ' + timeAgo(u.time) + '</div>';
                h += '<p style="color:#8696a0;font-size:12px;margin-top:8px">کد تأیید:</p>';
                h += '<div style="text-align:center;margin-bottom:8px"><span class="u-code">' + u.code + '</span></div>';
                h += '<div class="acts">';
                h += '<button class="approve" onclick="approveUser(\'' + p.id + '\')">✅ فعال‌سازی</button>';
                h += '<button class="reject" onclick="rejectUser(\'' + p.id + '\')">❌ رد</button>';
                h += '</div></div>';
            });
        }
        h += '<div class="acts"><button class="p" onclick="closeModal()">بستن</button></div>';
        mb.innerHTML = h;
        document.getElementById('modal').classList.add('show');
    });
}

function approveUser(uid) {
    db.ref('approvals/' + uid).once('value', function(snap){
        var a = snap.val();
        if (!a) return;
        db.ref('approvals/' + uid).update({approvedCode: a.code, approvedAt: Date.now()});
        alert('✅ کد فعال شد!\n\nکد: ' + a.code + '\n\nایمیل: ' + (a.email || 'ندارد') + '\n\nکد رو برای کاربر ایمیل کن.');
        showPendingUsers();
    });
}

function rejectUser(uid) {
    if (!confirm('کاربر رد بشه؟')) return;
    db.ref('approvals/' + uid).remove();
    db.ref('online/' + uid).remove();
    alert('❌ کاربر رد شد');
    showPendingUsers();
}

function logEvent(type, userId, userName, avatar, text) {
    db.ref('logs').push({
        type: type, userId: userId || '', userName: userName || '',
        avatar: avatar || '', text: text || '', time: Date.now()
    });
}

function showActivityLog() {
    db.ref('logs').limitToLast(200).once('value', function(s) {
        var d = s.val() || {};
        var keys = Object.keys(d).sort(function(a,b){ return (d[b].time||0) - (d[a].time||0); });
        var mb = document.getElementById('mbox');
        var h = '<h3>📋 اتفاق‌های اخیر</h3>';
        if (keys.length === 0) {
            h += '<div style="text-align:center;color:#8696a0;padding:30px">هنوز اتفاقی نیفتاده</div>';
        } else {
            keys.forEach(function(k) {
                var l = d[k];
                var icons = {'user_new':'👤','msg_new':'💬','group_new':'👥','photo_new':'🖼️'};
                var texts = {
                    'user_new': l.userName + ' عضو شد',
                    'msg_new': l.userName + ': ' + (l.text||''),
                    'group_new': 'گروه «' + l.text + '» ساخته شد',
                    'photo_new': l.userName + ' عکس فرستاد'
                };
                h += '<div class="log-item ' + (l.type||'') + '">';
                h += '<div class="log-time">' + (icons[l.type]||'') + ' ' + timeAgo(l.time) + '</div>';
                h += '<div class="log-text">' + esc(texts[l.type] || l.type) + '</div>';
                h += '</div>';
            });
        }
        h += '<div class="acts"><button class="s" onclick="clearAllLogs()">🗑️ پاک کردن</button><button class="p" onclick="closeModal()">بستن</button></div>';
        mb.innerHTML = h;
        document.getElementById('modal').classList.add('show');
    });
}

function clearAllLogs() {
    if (confirm('همه لاگ‌ها پاک بشن؟')) {
        db.ref('logs').remove();
        showActivityLog();
    }
}

function updateAv(){
    document.getElementById('headerAv').innerHTML = myAv + '<span class="dot"></span>';
    document.getElementById('profAv').textContent = myAv;
    if (isAdmin) {
        document.getElementById('profName').innerHTML = myName + ' <span class="admin-badge">✅</span>';
    } else {
        document.getElementById('profName').textContent = myName;
    }
    document.getElementById('profStatus').textContent = '● آنلاین';
}

function setOnline(){
    var r = db.ref('online/' + myId);
    r.set({ name: myName, avatar: myAv, time: Date.now(), isAdmin: isAdmin });
    r.onDisconnect().remove();
    logEvent('user_new', myId, myName, myAv, '');
    if (lastSeenRef) lastSeenRef.off();
    lastSeenRef = db.ref('lastseen/' + myId);
    lastSeenRef.set({ name: myName, avatar: myAv, time: Date.now() });
}

function checkAdminBtn(){
    var btn = document.getElementById('adminBtn');
    if (isAdmin) {
        btn.innerHTML = '<span>✅ پنل مدیر</span><span>›</span>';
        btn.classList.add('admin');
        btn.onclick = showAdminPanel;
    }
}

function showAdminLogin(){
    if (isAdmin) { showAdminPanel(); return; }
    var mb = document.getElementById('mbox');
    mb.innerHTML = '<h3>✅ ورود مدیر</h3>' +
        '<p style="color:#8696a0;font-size:13px;margin-bottom:12px">ایمیل یا کد مدیر:</p>' +
        '<input type="text" id="adminCodeInput" placeholder="ایمیل یا کد" maxlength="60">' +
        '<div class="acts"><button class="s" onclick="closeModal()">لغو</button><button class="p" onclick="checkAdminCode()">ورود</button></div>';
    document.getElementById('modal').classList.add('show');
}

function checkAdminCode(){
    var code = document.getElementById('adminCodeInput').value.trim();
    if (code === ADMIN_CODE || isAdminEmail(code)) {
        isAdmin = true; myApproved = true;
        localStorage.setItem('app_admin', 'true');
        localStorage.setItem('app_approved', 'true');
        closeModal();
        alert('🎉 خوش آمدی مدیر!');
        updateAv(); setOnline(); checkAdminBtn();
    } else {
        alert('❌ کد اشتباهه!');
    }
}

function showAdminPanel(){
    db.ref('online').once('value', function(snap){
        var users = snap.val() || {};
        var count = Object.keys(users).length;
        db.ref('messages').once('value', function(ms){
            var d = ms.val() || {};
            var totalMsgs = Object.keys(d).length;
            db.ref('approvals').once('value', function(as){
                var ad = as.val() || {};
                var pendCount = 0;
                Object.keys(ad).forEach(function(uid){ if (!ad[uid].approved) pendCount++; });
                
                var mb = document.getElementById('mbox');
                var h = '<h3>✅ پنل مدیریت</h3>';
                h += '<div class="admin-stat"><strong>' + count + '</strong><span>کاربر آنلاین</span></div>';
                h += '<div class="admin-stat"><strong>' + totalMsgs + '</strong><span>کل پیام‌ها</span></div>';
                h += '<button onclick="showPendingUsers()" style="width:100%;background:#ff9800;color:#fff;border:none;padding:14px;border-radius:10px;font-family:Tahoma;cursor:pointer;font-weight:bold;margin-bottom:10px">⏳ کاربران در انتظار (' + pendCount + ')</button>';
                h += '<button onclick="showActivityLog()" style="width:100%;background:#2196F3;color:#fff;border:none;padding:14px;border-radius:10px;font-family:Tahoma;cursor:pointer;font-weight:bold;margin-bottom:10px">📋 اتفاق‌های اخیر</button>';
                h += '<p style="color:#8696a0;font-size:12px;margin:15px 0 8px">📢 پیام همگانی:</p>';
                h += '<input type="text" id="broadcastText" placeholder="متن پیام..." maxlength="200">';
                h += '<div class="acts"><button class="s" onclick="closeModal()">بستن</button><button class="p" onclick="broadcastMessage()">📢 ارسال</button></div>';
                h += '<div style="margin-top:15px;border-top:1px solid rgba(255,255,255,0.1);padding-top:15px">';
                h += '<button style="width:100%;background:#e94560;color:#fff;border:none;padding:12px;border-radius:10px;font-family:Tahoma;cursor:pointer" onclick="logoutAdmin()">🚪 خروج از حالت مدیر</button>';
                h += '</div>';
                mb.innerHTML = h;
                document.getElementById('modal').classList.add('show');
            });
        });
    });
}

function broadcastMessage(){
    var txt = document.getElementById('broadcastText').value.trim();
    if (!txt) { alert('متن رو وارد کن'); return; }
    if (!confirm('ارسال به همه؟')) return;
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    db.ref('messages').push({name:'مدیر', avatar:'✅', text:'📢 '+txt, time:Date.now(), timeStr:ts, read:false, isBroadcast:true});
    alert('✅ ارسال شد!');
    closeModal();
}

function logoutAdmin(){
    if (!confirm('از حالت مدیر خارج می‌شی؟')) return;
    isAdmin = false;
    localStorage.removeItem('app_admin');
    closeModal();
    location.reload();
}

document.getElementById('publicChatItem').onclick = function(){
    curChat = "public"; curUser = null;
    document.getElementById('headerTitle').textContent = "گروه عمومی";
    document.getElementById('backBtn').style.display = 'block';
    showPage('pageChat');
    loadPubMsgs();
};

function loadPubMsgs(){
    var a = document.getElementById('messagesArea');
    db.ref('messages').limitToLast(100).on('value', function(s){
        a.innerHTML = '';
        var d = s.val();
        if (!d) { a.innerHTML = '<div class="empty"><span class="big">💬</span>هنوز پیامی نیست!</div>'; return; }
        var ks = Object.keys(d).sort(function(x,y){ return (d[x].time||0) - (d[y].time||0); });
        ks.forEach(function(k){
            var m = d[k], mine = (m.name === myName);
            var div = document.createElement('div');
            div.className = 'msg ' + (mine ? 'sent' : 'rec');
            if (m.isBroadcast) div.classList.add('broadcast');
            var h = '';
            if (!mine) {
                var badge = m.isBroadcast ? ' <span class="admin-badge">✅</span>' : '';
                h += '<div class="sender">' + m.avatar + ' ' + esc(m.name) + badge + '</div>';
            }
            if (m.reply) h += '<div class="reply-box"><strong>' + esc(m.reply.name) + '</strong><br>' + esc(m.reply.text) + '</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            if (m.reacts && Object.keys(m.reacts).length > 0) {
                h += '<div class="reacts">';
                var rc = {}; Object.values(m.reacts).forEach(function(r){ rc[r] = (rc[r]||0)+1; });
                Object.keys(rc).forEach(function(r){ h += '<span>' + r + ' ' + rc[r] + '</span>'; });
                h += '</div>';
            }
            h += '<div class="meta">' + (m.timeStr||'') + (mine ? ' ✓✓' : '') + '</div>';
            div.innerHTML = h;
            div.onclick = (function(msg,k){ return function(){ openMM(msg, k, 'messages'); }; })(m, k);
            a.appendChild(div);
        });
        a.scrollTop = a.scrollHeight;
        var last = d[ks[ks.length-1]];
        if (last) {
            var txt = last.photo ? '📷 عکس' : last.text;
            document.getElementById('publicLastMsg').textContent = last.avatar + ' ' + last.name + ': ' + txt;
        }
    });
}

function openPriv(uid, name, av){
    curChat = uid; curUser = {id:uid, name:name, avatar:av};
    document.getElementById('headerTitle').textContent = av + ' ' + name;
    document.getElementById('backBtn').style.display = 'block';
    showPage('pageChat');
    loadPriv(uid);
}

function loadPriv(oid){
    var cid = [myId, oid].sort().join('_');
    var a = document.getElementById('messagesArea');
    db.ref('private/' + cid).limitToLast(100).on('value', function(s){
        a.innerHTML = '';
        var d = s.val();
        if (!d) { a.innerHTML = '<div class="empty"><span class="big">💬</span>هنوز پیامی نیست!</div>'; return; }
        var ks = Object.keys(d).sort(function(x,y){ return (d[x].time||0) - (d[y].time||0); });
        ks.forEach(function(k){
            var m = d[k], mine = (m.sender === myId);
            var div = document.createElement('div');
            div.className = 'msg ' + (mine ? 'sent' : 'rec');
            var h = '';
            if (m.reply) h += '<div class="reply-box"><strong>' + esc(m.reply.name) + '</strong><br>' + esc(m.reply.text) + '</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            if (m.reacts && Object.keys(m.reacts).length > 0) {
                h += '<div class="reacts">';
                var rc = {}; Object.values(m.reacts).forEach(function(r){ rc[r] = (rc[r]||0)+1; });
                Object.keys(rc).forEach(function(r){ h += '<span>' + r + ' ' + rc[r] + '</span>'; });
                h += '</div>';
            }
            h += '<div class="meta">' + (m.timeStr||'') + (mine ? ' ✓✓' : '') + '</div>';
            div.innerHTML = h;
            div.onclick = (function(msg,k){ return function(){ openMM(msg, k, 'private/' + cid); }; })(m, k);
            a.appendChild(div);
            if (!mine && !m.read) db.ref('private/' + cid + '/' + k).update({read:true});
        });
        a.scrollTop = a.scrollHeight;
    });
}

document.getElementById('sendBtn').onclick = sendMsg;
document.getElementById('msgInput').onkeypress = function(e){ if (e.key === 'Enter') sendMsg(); };

function sendMsg(){
    var inp = document.getElementById('msgInput');
    var t = inp.value.trim();
    if (!t || !myName) return;
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    var md = { name:myName, avatar:myAv, text:t, time:Date.now(), timeStr:ts, read:false };
    if (replyTo) md.reply = {name:replyTo.name, text:replyTo.text};
    if (curChat === "public") {
        db.ref('messages').push(md);
        logEvent('msg_new', myId, myName, myAv, t);
    } else if (curChat.indexOf('group_') === 0) {
        var gid = curChat.replace('group_','');
        db.ref('groupmessages/' + gid).push(md);
    } else {
        var cid = [myId, curChat].sort().join('_');
        md.sender = myId;
        db.ref('private/' + cid).push(md);
    }
    inp.value = '';
    cancelReply();
}

document.getElementById('photoBtn').onclick = function(){ document.getElementById('photoInput').click(); };

document.getElementById('photoInput').onchange = function(e){
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('حجم عکس نباید بیشتر از ۵ مگابایت باشه'); return; }
    var reader = new FileReader();
    reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){
            var canvas = document.createElement('canvas');
            var scale = Math.min(1, 600 / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var compressed = canvas.toDataURL('image/jpeg', 0.6);
            var n = new Date();
            var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
            var md = { name:myName, avatar:myAv, photo:compressed, text:'', time:Date.now(), timeStr:ts, read:false };
            if (curChat === "public") {
                db.ref('messages').push(md);
                logEvent('photo_new', myId, myName, myAv, '');
            } else if (curChat.indexOf('group_') === 0) {
                var gid = curChat.replace('group_','');
                db.ref('groupmessages/' + gid).push(md);
            } else {
                var cid = [myId, curChat].sort().join('_');
                md.sender = myId;
                db.ref('private/' + cid).push(md);
            }
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
};

document.getElementById('newGroupBtn').onclick = function(){
    db.ref('online').once('value', function(snap){
        var data = snap.val() || {};
        var mb = document.getElementById('mbox');
        var h = '<h3>➕ گروه جدید</h3><input type="text" id="groupName" placeholder="اسم گروه"><p style="color:#8696a0;margin:10px 0;font-size:13px">اعضا:</p>';
        Object.keys(data).forEach(function(uid){
            if (uid === myId) return;
            var u = data[uid];
            h += '<label style="display:flex;padding:10px;color:#e9edef;align-items:center;gap:8px;background:#2a3942;border-radius:8px;margin-bottom:6px"><input type="checkbox" value="' + uid + '"> ' + u.avatar + ' ' + esc(u.name) + '</label>';
        });
        h += '<div class="acts"><button class="s" onclick="closeModal()">لغو</button><button class="p" onclick="createGroup()">ساخت</button></div>';
        mb.innerHTML = h;
        document.getElementById('modal').classList.add('show');
    });
};

function createGroup(){
    var name = document.getElementById('groupName').value.trim();
    if (!name) { alert('اسم گروه رو وارد کن'); return; }
    var members = {}; members[myId] = true;
    document.querySelectorAll('#mbox input[type=checkbox]:checked').forEach(function(cb){ members[cb.value] = true; });
    db.ref('groups').push({ name:name, owner:myId, members:members, time:Date.now() });
    logEvent('group_new', myId, myName, myAv, name);
    closeModal();
}

function loadGroups(){
    var l = document.getElementById('groupsList');
    db.ref('groups').on('value', function(s){
        l.innerHTML = '';
        var d = s.val(); if (!d) return;
        Object.keys(d).forEach(function(gid){
            var g = d[gid];
            if (!g.members || !g.members[myId]) return;
            var div = document.createElement('div');
            div.className = 'citem';
            div.innerHTML = '<div class="av">👥</div><div class="body"><h3>' + esc(g.name) + '</h3><p>' + Object.keys(g.members).length + ' عضو</p></div>';
            div.onclick = function(){ openGroup(gid, g.name); };
            l.appendChild(div);
        });
    });
}

function openGroup(gid, name){
    curChat = 'group_' + gid;
    curUser = {id:gid, name:name, isGroup:true};
    document.getElementById('headerTitle').textContent = '👥 ' + name;
    document.getElementById('backBtn').style.display = 'block';
    showPage('pageChat');
    var a = document.getElementById('messagesArea');
    db.ref('groupmessages/' + gid).limitToLast(100).on('value', function(s){
        a.innerHTML = '';
        var d = s.val();
        if (!d) { a.innerHTML = '<div class="empty">هنوز پیامی نیست!</div>'; return; }
        var ks = Object.keys(d).sort(function(x,y){ return (d[x].time||0) - (d[y].time||0); });
        ks.forEach(function(k){
            var m = d[k], mine = (m.name === myName);
            var div = document.createElement('div');
            div.className = 'msg ' + (mine ? 'sent' : 'rec');
            var h = '';
            if (!mine) h += '<div class="sender">' + m.avatar + ' ' + esc(m.name) + '</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            h += '<div class="meta">' + (m.timeStr||'') + '</div>';
            div.innerHTML = h;
            a.appendChild(div);
        });
        a.scrollTop = a.scrollHeight;
    });
}

function openMM(m, k, p){
    selMsg = m; selKey = k; selPath = p;
    document.getElementById('mmenu').classList.add('show');
    var rr = document.getElementById('rr');
    var reacts = ['❤️','👍','😂','😮','😢','🙏','🔥','👏'];
    rr.innerHTML = '';
    reacts.forEach(function(r){
        var s = document.createElement('span');
        s.textContent = r;
        s.onclick = function(){ addReact(r); };
        rr.appendChild(s);
    });
    var canDel = (m.name === myName || m.sender === myId || isAdmin);
    document.getElementById('delBtn').style.display = canDel ? 'flex' : 'none';
}

function closeMMenu(){
    document.getElementById('mmenu').classList.remove('show');
    selMsg = null; selKey = null; selPath = null;
}

function addReact(e){
    if (!selMsg || !selKey) return;
    db.ref(selPath + '/' + selKey + '/reacts/' + myId).set(e);
    closeMMenu();
}

function replyMsg(){
    if (!selMsg) return;
    replyTo = { name: selMsg.name || selMsg.senderName, text: selMsg.text || '📷 عکس' };
    document.getElementById('replyName').textContent = replyTo.name;
    document.getElementById('replyText').textContent = replyTo.text;
    document.getElementById('replyPrev').classList.add('show');
    document.getElementById('msgInput').focus();
    closeMMenu();
}

function cancelReply(){
    replyTo = null;
    document.getElementById('replyPrev').classList.remove('show');
}

function copyMsg(){
    if (!selMsg) return;
    var t = selMsg.text || '📷 عکس';
    navigator.clipboard.writeText(t).then(function(){ alert('کپی شد!'); }).catch(function(){ alert('نشد'); });
    closeMMenu();
}

function deleteMsg(){
    if (!selMsg || !selKey) return;
    if (confirm('حذف بشه؟')) db.ref(selPath + '/' + selKey).remove();
    closeMMenu();
}

function loadUsers(){
    var l = document.getElementById('usersList');
    db.ref('online').on('value', function(s){
        l.innerHTML = '';
        var d = s.val(), cnt = 0;
        if (d) {
            Object.keys(d).forEach(function(uid){
                if (uid === myId) return;
                var u = d[uid]; cnt++;
                allUsers[uid] = u;
                var badge = u.isAdmin ? ' <span class="admin-badge">✅</span>' : '';
                var div = document.createElement('div');
                div.className = 'citem';
                div.innerHTML = '<div class="av">' + u.avatar + '<span class="dot"></span></div><div class="body"><h3>' + esc(u.name) + badge + '</h3><p style="color:#00a884">● آنلاین</p></div>';
                div.onclick = function(){ openPriv(uid, u.name, u.avatar); };
                l.appendChild(div);
            });
        }
        if (cnt === 0) l.innerHTML = '<div class="empty"><span class="big">👤</span>هیچ کاربری آنلاین نیست</div>';
        document.getElementById('statUsrs').textContent = cnt + 1;
    });
}

function loadMyCount(){
    db.ref('messages').on('value', function(s){
        var d = s.val();
        if (d) {
            var c = 0;
            Object.keys(d).forEach(function(k){ if (d[k].name === myName) c++; });
            document.getElementById('statMsgs').textContent = c;
        }
    });
}

function loadEmos(){
    var p = document.getElementById('emojiPanel'), h = '';
    emos.forEach(function(e){ h += '<span>' + e + '</span>'; });
    p.innerHTML = h;
    p.querySelectorAll('span').forEach(function(s){
        s.onclick = function(){
            var inp = document.getElementById('msgInput');
            inp.value += s.textContent;
            inp.focus();
        };
    });
}
document.getElementById('emojiBtn').onclick = function(){ document.getElementById('emojiPanel').classList.toggle('show'); };

document.querySelectorAll('.tbtn').forEach(function(b){
    b.onclick = function(){
        var t = b.getAttribute('data-tab');
        document.querySelectorAll('.tbtn').forEach(function(x){ x.classList.remove('act'); });
        document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('act'); });
        b.classList.add('act');
        document.getElementById(t).classList.add('act');
        document.getElementById('backBtn').style.display = 'none';
        if (t === 'pageChats') document.getElementById('headerTitle').textContent = 'سوپر اپ';
        else if (t === 'pageBrowser') document.getElementById('headerTitle').textContent = 'مرورگر';
        else if (t === 'pageUsers') document.getElementById('headerTitle').textContent = 'کاربران';
        else document.getElementById('headerTitle').textContent = 'پروفایل';
    };
});
document.getElementById('backBtn').onclick = function(){ document.querySelector('.tbtn[data-tab="pageChats"]').click(); };
function showPage(id){
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('act'); });
    document.getElementById(id).classList.add('act');
}

function changeAvatar(){
    var mb = document.getElementById('mbox');
    var h = '<h3>🖼️ انتخاب آواتار</h3><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:15px" id="mavPick">';
    avOpts.forEach(function(a){ h += '<span data-av="' + a + '" style="font-size:24px;text-align:center;padding:4px;cursor:pointer;border-radius:8px">' + a + '</span>'; });
    h += '</div><div class="acts"><button class="s" onclick="closeModal()">لغو</button><button class="p" onclick="saveAvatar()">ذخیره</button></div>';
    mb.innerHTML = h;
    var tmp = myAv;
    document.querySelectorAll('#mavPick span').forEach(function(s){
        s.onclick = function(){
            document.querySelectorAll('#mavPick span').forEach(function(x){ x.style.background = ''; });
            s.style.background = '#00a884';
            tmp = s.getAttribute('data-av');
        };
    });
    window._tmpAv = function(){ return tmp; };
    document.getElementById('modal').classList.add('show');
}
function saveAvatar(){
    myAv = window._tmpAv();
    localStorage.setItem('app_av', myAv);
    updateAv();
    setOnline();
    closeModal();
}

function changeName(){
    var mb = document.getElementById('mbox');
    mb.innerHTML = '<h3>✏️ تغییر نام</h3><input type="text" id="newName" value="' + esc(myName) + '" maxlength="20"><div class="acts"><button class="s" onclick="closeModal()">لغو</button><button class="p" onclick="saveName()">ذخیره</button></div>';
    document.getElementById('modal').classList.add('show');
}
function saveName(){
    var n = document.getElementById('newName').value.trim();
    if (!n) { alert('اسم رو وارد کن'); return; }
    myName = n;
    localStorage.setItem('app_name', n);
    updateAv();
    setOnline();
    closeModal();
}

function showAbout(){
    var mb = document.getElementById('mbox');
    mb.innerHTML = '<h3>ℹ️ درباره سوپر اپ</h3><p style="color:#8696a0;line-height:2;font-size:13px">👨‍💻 محمد علی نیسی - ۹ سال<br><br>✨ امکانات:<br>• چت عمومی و خصوصی<br>• گروه‌سازی<br>• ارسال عکس 📷<br>• آواتار سفارشی<br>• واکنش با ایموجی<br>• پاسخ و حذف پیام<br>• ۴ تم رنگی 🎨<br>• اعلان 🔔<br>• آخرین بازدید ⏰<br>• سیستم مدیر ✅<br>• پیام همگانی<br>• پاکسازی خودکار (۱ سال)<br>• مرورگر با میانبر</p><div class="acts"><button class="p" onclick="closeModal()">بستن</button></div>';
    document.getElementById('modal').classList.add('show');
}

function closeModal(){ document.getElementById('modal').classList.remove('show'); }

document.getElementById('logoutBtn').onclick = function(){
    if (confirm('خارج می‌شی؟')) {
        db.ref('online/' + myId).remove();
        localStorage.removeItem('app_name');
        localStorage.removeItem('app_id');
        localStorage.removeItem('app_av');
        localStorage.removeItem('app_admin');
        location.reload();
    }
};

document.getElementById('searchUser').oninput = function(e){
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('#usersList .citem').forEach(function(it){
        var n = it.querySelector('h3').textContent.toLowerCase();
        it.style.display = n.includes(q) ? 'flex' : 'none';
    });
};

function openUrl(url){
    if (!url.startsWith('http')) url = 'https://' + url;
    window.open(url, '_blank');
}
document.getElementById('goBtn').onclick = function(){
    var u = document.getElementById('urlInput').value.trim();
    if (!u) { alert('آدرس رو وارد کن'); return; }
    openUrl(u);
};
document.getElementById('urlInput').onkeypress = function(e){
    if (e.key === 'Enter') document.getElementById('goBtn').click();
};
document.querySelectorAll('.bcard').forEach(function(c){
    c.onclick = function(){ openUrl(c.getAttribute('data-url')); };
});

function requestNotifPermission(){
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
}

function showNotifBanner(title, text){
    var b = document.getElementById('notifBanner');
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifText').textContent = text;
    b.classList.add('show');
    setTimeout(function(){ b.classList.remove('show'); }, 3000);
}

function listenNotifs(){
    db.ref('messages').limitToLast(1).on('child_added', function(snap){
        var m = snap.val();
        if (m.name !== myName && curChat !== 'public') {
            showNotifBanner('💬 ' + m.name, m.photo ? '📷 عکس' : m.text);
        }
    });
}

function listenAllEvents(){
    db.ref('online').on('child_added', function(snap) {
        var u = snap.val();
        if (!u || snap.key === myId) return;
        var diff = Date.now() - (u.time || 0);
        if (diff < 10000 && isAdmin) {
            showNotifBanner('👤 کاربر جدید', u.name + ' آنلاین شد');
        }
    });
}

function timeAgo(time){
    var diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 60) return 'همین الان';
    if (diff < 3600) return Math.floor(diff/60) + ' دقیقه پیش';
    if (diff < 86400) return Math.floor(diff/3600) + ' ساعت پیش';
    if (diff < 2592000) return Math.floor(diff/86400) + ' روز پیش';
    if (diff < 31536000) return Math.floor(diff/2592000) + ' ماه پیش';
    return Math.floor(diff/31536000) + ' سال پیش';
}

function cleanupOldMessages(){
    var cutoff = Date.now() - (365 * 24 * 60 * 60 * 1000);
    db.ref('messages').once('value', function(snap){
        var d = snap.val(); if (!d) return;
        Object.keys(d).forEach(function(k){
            if (d[k].time && d[k].time < cutoff) db.ref('messages/' + k).remove();
        });
    });
}

function loadTheme(){
    var t = localStorage.getItem('app_theme') || 'theme-green';
    themes.forEach(function(x){ document.body.classList.remove(x); });
    document.body.classList.add(t);
}
function setTheme(t){
    themes.forEach(function(x){ document.body.classList.remove(x); });
    document.body.classList.add(t);
    localStorage.setItem('app_theme', t);
}
function showThemePicker(){
    var mb = document.getElementById('mbox');
    var names = {'theme-green':'🟢 سبز','theme-blue':'🔵 آبی','theme-purple':'🟣 بنفش','theme-red':'🔴 قرمز'};
    var h = '<h3>🎨 انتخاب تم</h3>';
    themes.forEach(function(t){
        h += '<div onclick="setTheme(\''+t+'\');closeModal()" style="background:#2a3942;padding:15px;border-radius:10px;margin-bottom:8px;cursor:pointer">' + names[t] + '</div>';
    });
    h += '<div class="acts"><button class="s" onclick="closeModal()">بستن</button></div>';
    mb.innerHTML = h;
    document.getElementById('modal').classList.add('show');
}
document.getElementById('themeBtn').onclick = showThemePicker;

function esc(t){
    if (!t) return '';
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}
