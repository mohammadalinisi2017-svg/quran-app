// ============================================================
// Firebase
// ============================================================
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
var auth = firebase.auth();

var VAPID_KEY = "";

// ============================================================
// Globals
// ============================================================
var myName = "", myId = "", myPhone = "", myAv = "😊";
var curChat = "public", curUser = null;
var replyTo = null, selMsg = null, selKey = null, selPath = null, selAv = "😊";
var allUsers = {}, lastSeenRef = null;
var myApprovalCode = localStorage.getItem('app_approval_code') || '';
var myApproved = localStorage.getItem('app_approved') === 'true';

var ADMIN_CODE = "neysi2025";
var isAdmin = localStorage.getItem('app_admin') === 'true';

// WebRTC
var pc = null, localStream = null, currentCallId = null, currentCallPeer = null;
var isCaller = false, isMuted = false, ringtoneCtx = null, callTimeoutHandle = null;
var rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Typing
var typingTimeout = null;
var typingListenerRef = null;

// Media / Recording
var mediaRecorder = null;
var audioChunks = [];
var recTimer = null;
var recSeconds = 0;

// Edit
var editingMsg = null;

// Forward
var fwdMsg = null;

// Search
var searchMatches = [];
var searchIdx = -1;

// Notifications
var unreadCounts = {};
var unreadTotal = 0;
var notifPermGranted = false;
var notificationAudio = null;

// FCM
var messaging = null;

var avOpts = ['😊','😎','🤓','🥳','😇','🤠','👦','👧','🧑','👨','👩','🧔','👶','🐱','🐶','🦊','🐻','🐼','🦁','🐯','🦄','🐸','🐵','🦉','🌟','⭐','💫','✨','🔥','⚡','🌸','🌹'];
var emos = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😜','🤗','🤔','😐','😑','🙄','😏','😥','😮','😴','😌','😔','😢','😭','😱','😡','😷','👍','👎','👌','✌️','🤞','🤙','👉','👈','👆','👇','✋','🙏','💪','❤️','🧡','💛','💚','💙','💜','💔','💕','💖','🌹','🌟','⭐','✨','🔥','🎉','🎊','🎁','🏆','✅','💎','🌈','☀️','🌙','⚡','🍕','🍔','☕','⚽','🎮','🎵','📱','💻','🚀','🎂','🍰','🐱','🐶','🌸'];
var themes = ['theme-green','theme-blue','theme-purple','theme-red'];

// ============================================================
// Avatar Picker
// ============================================================
function loadAvPick(){
    var p = document.getElementById('avPick'), h = '';
    avOpts.forEach(function(a){ h += '<span data-av="'+a+'">'+a+'</span>'; });
    p.innerHTML = h;
    var spans = p.querySelectorAll('span');
    spans.forEach(function(s){
        s.onclick = function(){
            spans.forEach(function(x){ x.classList.remove('sel'); });
            s.classList.add('sel');
            selAv = s.getAttribute('data-av');
        };
    });
    if (spans[0]) spans[0].classList.add('sel');
}
loadAvPick();

// ============================================================
// Login
// ============================================================
document.getElementById('loginBtn').onclick = async function(){
    var n = document.getElementById('nameInput').value.trim();
    var p = document.getElementById('phoneInput').value.trim();
    if (!n) { alert('اسمت رو وارد کن!'); return; }
    if (!p || !/^09\d{9}$/.test(p)) { alert('شماره تلفن معتبر وارد کن'); return; }

    try {
        if (auth.currentUser) await auth.signOut();
        var cred = await auth.signInAnonymously();
        myId = cred.user.uid;
        myName = n;
        myPhone = p;
        myAv = selAv;

        localStorage.setItem('app_name', n);
        localStorage.setItem('app_phone', p);
        localStorage.setItem('app_id', myId);
        localStorage.setItem('app_av', myAv);

        db.ref('users/' + myId).set({
            name: myName, phone: myPhone, avatar: myAv,
            isAdmin: false, createdAt: Date.now()
        });

        startApp();
    } catch (err) {
        console.error('Login error:', err);
        alert('خطا در ورود: ' + err.message);
    }
};

auth.onAuthStateChanged(function(user){
    if (user) {
        myId = user.uid;
        myName = localStorage.getItem('app_name') || '';
        myPhone = localStorage.getItem('app_phone') || '';
        myAv = localStorage.getItem('app_av') || '😊';
        if (myName) startApp();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

// ============================================================
// Start
// ============================================================
function startApp(){
    document.getElementById('loginScreen').style.display = 'none';

    if (!isAdmin && !myApproved) {
        sendApprovalRequest();
        return;
    }

    document.getElementById('header').style.display = 'flex';
    document.getElementById('tabs').style.display = 'flex';
    updateAv();
    initPresence();
    loadUsers();
    loadChatsList();
    loadEmos();
    loadMyCount();
    loadTheme();
    cleanupOldMessages();
    checkAdminBtn();
    listenAllEvents();
    initNotifications();
    initNotificationSystem();
    listenIncomingCalls();
    addCallButton();

    // جدید
    document.getElementById('recBtn').onclick = startRecording;
    document.getElementById('searchHeaderBtn').onclick = openSearch;
    document.getElementById('fileBtn').onclick = function(){
        document.getElementById('fileInput').click();
    };
}

// ============================================================
// Presence
// ============================================================
function initPresence(){
    var myStatusRef = db.ref('status/' + myId);
    var connRef = db.ref('.info/connected');

    connRef.on('value', function(snap){
        if (snap.val() === false) return;
        myStatusRef.onDisconnect().set({
            state: 'offline',
            lastChanged: firebase.database.ServerValue.TIMESTAMP
        }).then(function(){
            myStatusRef.set({
                state: 'online',
                lastChanged: firebase.database.ServerValue.TIMESTAMP,
                name: myName, avatar: myAv, isAdmin: isAdmin
            });
        });
    });

    var r = db.ref('online/' + myId);
    r.set({ name: myName, avatar: myAv, time: Date.now(), isAdmin: isAdmin });
    r.onDisconnect().remove();

    if (lastSeenRef) lastSeenRef.off();
    lastSeenRef = db.ref('lastseen/' + myId);
    lastSeenRef.set({ name: myName, avatar: myAv, time: Date.now() });
    lastSeenRef.onDisconnect().set({ name: myName, avatar: myAv, time: Date.now() });
}

function watchUserStatus(uid, cb){
    var r = db.ref('status/' + uid);
    return r.on('value', function(snap){
        cb(snap.val() || { state: 'offline' });
    });
}

// ============================================================
// Typing
// ============================================================
function setTyping(chatId, isTyping){
    if (!myId) return;
    var r = db.ref('typing/' + chatId + '/' + myId);
    if (isTyping) {
        r.set(true);
        r.onDisconnect().remove();
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function(){ r.remove(); }, 4000);
    } else {
        r.remove();
    }
}

function watchTyping(chatId, cb){
    if (typingListenerRef) typingListenerRef.off();
    typingListenerRef = db.ref('typing/' + chatId);
    typingListenerRef.on('value', function(snap){
        var val = snap.val() || {};
        var others = Object.keys(val).filter(function(u){ return u !== myId; });
        cb(others);
    });
}

function showTypingIndicator(chatId){
    watchTyping(chatId, function(uids){
        var area = document.getElementById('messagesArea');
        var old = document.getElementById('typingIndicator');
        if (old) old.remove();
        if (uids.length > 0) {
            var div = document.createElement('div');
            div.id = 'typingIndicator';
            div.className = 'typing-indicator';
            var nm = allUsers[uids[0]] ? allUsers[uids[0]].name : 'کاربر';
            div.innerHTML = '<span>' + esc(nm) + ' در حال تایپ</span><div class="typing-dots"><span></span><span></span><span></span></div>';
            area.appendChild(div);
            area.scrollTop = area.scrollHeight;
        }
    });
}

// ============================================================
// Notifications - FCM
// ============================================================
async function initNotifications(){
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (!VAPID_KEY) return;
    try {
        var reg = await navigator.serviceWorker.register('/quran-app/firebase-messaging-sw.js');
        var perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
        messaging = firebase.messaging();
        var token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (token && myId) db.ref('users/' + myId + '/fcmToken').set(token);
        messaging.onMessage(function(payload){
            var n = payload.notification || {};
            showNotifBanner2(n.title || 'پیام جدید', n.body || '', '💬', null);
        });
    } catch (err) { console.log('FCM error:', err); }
}

function askNotifPermission(){
    if (!('Notification' in window)) {
        showToast('مرورگرت اعلان پشتیبانی نمی‌کنه');
        return;
    }
    if (Notification.permission === 'granted') {
        notifPermGranted = true;
        showToast('✅ اعلان‌ها فعالن');
        return;
    }
    if (Notification.permission === 'denied') {
        showToast('❌ اعلان‌ها رد شده. از تنظیمات مرورگر فعال کن');
        return;
    }
    Notification.requestPermission().then(function(p){
        notifPermGranted = (p === 'granted');
        showToast(p === 'granted' ? '✅ اعلان‌ها فعال شدن' : '❌ لغو شد');
    });
}

// ============================================================
// Approval
// ============================================================
function sendApprovalRequest(){
    if (!myApprovalCode) {
        myApprovalCode = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('app_approval_code', myApprovalCode);
    }
    db.ref('approvals/' + myId).set({
        name: myName, avatar: myAv, phone: myPhone,
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
        } else alert('❌ کد اشتباهه!');
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
        } else alert('⏳ هنوز تأیید نشدی');
    });
}

// ============================================================
// Admin
// ============================================================
function showAdminLogin(){
    if (isAdmin) { showAdminPanel(); return; }
    var mb = document.getElementById('mbox');
    mb.innerHTML = '<h3>✅ ورود مدیر</h3>' +
        '<p style="color:#8696a0;font-size:13px;margin-bottom:12px">کد مدیر:</p>' +
        '<input type="text" id="adminCodeInput" placeholder="کد" maxlength="30">' +
        '<div class="acts"><button class="s" onclick="closeModal()">لغو</button><button class="p" onclick="checkAdminCode()">ورود</button></div>';
    document.getElementById('modal').classList.add('show');
}

function checkAdminCode(){
    var code = document.getElementById('adminCodeInput').value.trim();
    if (code === ADMIN_CODE) {
        isAdmin = true; myApproved = true;
        localStorage.setItem('app_admin', 'true');
        localStorage.setItem('app_approved', 'true');
        closeModal();
        alert('🎉 خوش آمدی مدیر!');
        updateAv(); initPresence(); checkAdminBtn();
        startApp();
    } else alert('❌ کد اشتباهه!');
}

function checkAdminBtn(){
    var btn = document.getElementById('adminBtn');
    if (!btn) return;
    if (isAdmin) btn.textContent = '✅ پنل مدیر';
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
                h += '<div class="pending-user"><div class="u-name">' + u.avatar + ' ' + esc(u.name) + '</div>';
                if (u.phone) h += '<div class="u-email">📱 ' + esc(u.phone) + '</div>';
                h += '<div class="u-time">⏰ ' + timeAgo(u.time) + '</div>';
                h += '<p style="color:#8696a0;font-size:12px;margin-top:8px">کد تأیید:</p>';
                h += '<div style="text-align:center;margin-bottom:8px"><span class="u-code">' + u.code + '</span></div>';
                h += '<div class="acts"><button class="approve" onclick="approveUser(\'' + p.id + '\')">✅ فعال‌سازی</button>';
                h += '<button class="reject" onclick="rejectUser(\'' + p.id + '\')">❌ رد</button></div></div>';
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
        alert('✅ کد فعال شد!\n\nکد: ' + a.code + '\n\nشماره: ' + (a.phone || 'ندارد') + '\n\n(این کد رو به کاربر پیامک کن)');
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

function broadcastMessage(){
    var txt = document.getElementById('broadcastText').value.trim();
    if (!txt) { alert('متن رو وارد کن'); return; }
    if (!confirm('ارسال به همه؟')) return;
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    db.ref('messages').push({name:'مدیر', avatar:'✅', text:'📢 '+txt, time:Date.now(), timeStr:ts, read:false, isBroadcast:true, uid: myId});
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

// ============================================================
// Logs
// ============================================================
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
                h += '<div class="log-text">' + esc(texts[l.type] || l.type) + '</div></div>';
            });
        }
        h += '<div class="acts"><button class="s" onclick="clearAllLogs()">🗑️ پاک کردن</button><button class="p" onclick="closeModal()">بستن</button></div>';
        mb.innerHTML = h;
        document.getElementById('modal').classList.add('show');
    });
}

function clearAllLogs() {
    if (confirm('همه لاگ‌ها پاک بشن؟')) { db.ref('logs').remove(); showActivityLog(); }
}

// ============================================================
// Profile
// ============================================================
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

// ============================================================
// CHATS LIST
// ============================================================
function loadChatsList(){
    var l = document.getElementById('chatList');
    if (!l) return;

    db.ref('private').on('value', function(snap){
        var d = snap.val() || {};
        var chats = [];

        Object.keys(d).forEach(function(cid){
            var parts = cid.split('_');
            if (parts.indexOf(myId) === -1) return;

            var otherId = parts[0] === myId ? parts[1] : parts[0];
            var msgs = d[cid];
            var keys = Object.keys(msgs);
            if (keys.length === 0) return;

            var lastTime = 0, lastMsg = null;
            keys.forEach(function(k){
                var m = msgs[k];
                if ((m.time || 0) > lastTime) {
                    lastTime = m.time || 0;
                    lastMsg = m;
                }
            });

            if (lastMsg) {
                chats.push({
                    cid: cid, otherId: otherId,
                    lastMsg: lastMsg, lastTime: lastTime
                });
            }
        });

        chats.sort(function(a,b){ return b.lastTime - a.lastTime; });

        db.ref('groups').once('value', function(gSnap){
            var gd = gSnap.val() || {};
            var groups = [];
            Object.keys(gd).forEach(function(gid){
                var g = gd[gid];
                if (!g.members || !g.members[myId]) return;
                groups.push({ gid: gid, name: g.name, time: g.time || 0 });
            });
            groups.sort(function(a,b){ return b.time - a.time; });

            var h = '';

            h += '<div class="citem" id="publicChatItem">' +
                    '<div class="av">💬</div>' +
                    '<div class="body">' +
                        '<h3>گروه عمومی</h3>' +
                        '<p id="publicLastMsg">چت با همه</p>' +
                    '</div>' +
                 '</div>';

            groups.forEach(function(g){
                h += '<div class="citem" data-gid="' + g.gid + '">' +
                        '<div class="av">👥</div>' +
                        '<div class="body">' +
                            '<h3>' + esc(g.name) + '</h3>' +
                            '<p>گروه</p>' +
                        '</div>' +
                     '</div>';
            });

            chats.forEach(function(c){
                var u = allUsers[c.otherId] || {};
                var name = u.name || 'کاربر';
                var avatar = u.avatar || '👤';
                var lastText = c.lastMsg.photo ? '📷 عکس'
                             : c.lastMsg.voice ? '🎤 پیام صوتی'
                             : c.lastMsg.fileData ? '📎 فایل'
                             : (c.lastMsg.text || '');
                if (c.lastMsg.sender === myId) lastText = 'شما: ' + lastText;
                var timeStr = timeAgoShort(c.lastTime);

                h += '<div class="citem" data-uid="' + c.otherId + '" data-name="' + esc(name) + '" data-avatar="' + avatar + '">' +
                        '<div class="av">' + avatar + '</div>' +
                        '<div class="body">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center">' +
                                '<h3>' + esc(name) + '</h3>' +
                                '<span style="font-size:11px;color:#7a8aa8">' + timeStr + '</span>' +
                            '</div>' +
                            '<p>' + esc(lastText) + '</p>' +
                        '</div>' +
                     '</div>';
            });

            l.innerHTML = h;

            var pub = document.getElementById('publicChatItem');
            if (pub) pub.onclick = function(){
                curChat = "public"; curUser = null;
                markChatAsRead('messages');
                document.getElementById('headerTitle').textContent = "گروه عمومی";
                document.getElementById('headerStatus').textContent = "● آنلاین";
                document.getElementById('backBtn').style.display = 'block';
                showPage('pageChat');
                loadPubMsgs();
            };

            l.querySelectorAll('.citem[data-gid]').forEach(function(el){
                el.onclick = function(){
                    openGroup(el.getAttribute('data-gid'), el.querySelector('h3').textContent);
                };
            });

            l.querySelectorAll('.citem[data-uid]').forEach(function(el){
                var uid = el.getAttribute('data-uid');
                var cid = [myId, uid].sort().join('_');
                el.onclick = function(){
                    openPriv(uid, el.getAttribute('data-name'), el.getAttribute('data-avatar'));
                };
                // long press برای حذف چت
                var pressTimer;
                el.addEventListener('touchstart', function(){
                    pressTimer = setTimeout(function(){ deleteChat('private/' + cid); }, 800);
                });
                el.addEventListener('touchend', function(){ clearTimeout(pressTimer); });
                el.addEventListener('mousedown', function(){
                    pressTimer = setTimeout(function(){ deleteChat('private/' + cid); }, 800);
                });
                el.addEventListener('mouseup', function(){ clearTimeout(pressTimer); });
            });
        });
    });
}

// ============================================================
// Public Chat
// ============================================================
function loadPubMsgs(){
    var a = document.getElementById('messagesArea');
    markChatAsRead('messages');
    db.ref('messages').limitToLast(100).on('value', function(s){
        a.innerHTML = '';
        var d = s.val();
        if (!d) { a.innerHTML = '<div class="empty"><span class="big">💬</span>هنوز پیامی نیست!</div>'; return; }
        var ks = Object.keys(d).sort(function(x,y){ return (d[x].time||0) - (d[y].time||0); });
        ks.forEach(function(k){
            var m = d[k], mine = (m.uid === myId) || (m.name === myName && !m.uid);
            var div = document.createElement('div');
            div.className = 'msg ' + (mine ? 'sent' : 'rec');
            if (m.isBroadcast) div.classList.add('broadcast');
            var h = '';
            if (!mine) {
                var badge = m.isBroadcast ? ' <span class="admin-badge">✅</span>' : '';
                h += '<div class="sender">' + m.avatar + ' ' + esc(m.name) + badge + '</div>';
            }
            if (m.forwarded) h += '<div class="fwd-tag">↪️ فوروارد از ' + esc(m.forwardedFrom || 'کاربر') + '</div>';
            if (m.reply) h += '<div class="reply-box"><strong>' + esc(m.reply.name) + '</strong><br>' + esc(m.reply.text) + '</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.voice) h += renderVoiceHtml(m, mine);
            if (m.fileData) h += renderFileHtml(m);
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            if (m.reacts && Object.keys(m.reacts).length > 0) {
                h += '<div class="reacts">';
                var rc = {}; Object.values(m.reacts).forEach(function(r){ rc[r] = (rc[r]||0)+1; });
                Object.keys(rc).forEach(function(r){ h += '<span>' + r + ' ' + rc[r] + '</span>'; });
                h += '</div>';
            }
            var editedTag = m.edited ? ' <span class="edited-tag">(ویرایش‌شده)</span>' : '';
            h += '<div class="meta">' + (m.timeStr||'') + editedTag + (mine ? ' <span class="tick sent">✓✓</span>' : '') + '</div>';
            div.innerHTML = h;
            div.onclick = (function(msg,k){ return function(){ openMM(msg, k, 'messages'); }; })(m, k);
            a.appendChild(div);
        });
        a.scrollTop = a.scrollHeight;
    });
}

// ============================================================
// Private Chat
// ============================================================
function openPriv(uid, name, av){
    curChat = uid; curUser = {id:uid, name:name, avatar:av};
    markChatAsRead('private/' + [myId, uid].sort().join('_'));
    document.getElementById('headerTitle').textContent = av + ' ' + name;
    document.getElementById('headerStatus').textContent = '...';
    document.getElementById('backBtn').style.display = 'block';
    showPage('pageChat');
    loadPriv(uid);

    watchUserStatus(uid, function(status){
        var el = document.getElementById('headerStatus');
        if (!el) return;
        if (status.state === 'online') {
            el.textContent = '● آنلاین';
            el.className = 'status-text online';
        } else {
            el.textContent = status.lastChanged ? 'آخرین بازدید ' + timeAgo(status.lastChanged) : 'آفلاین';
            el.className = 'status-text';
        }
    });

    showTypingIndicator('private_' + [myId, uid].sort().join('_'));
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
            if (m.forwarded) h += '<div class="fwd-tag">↪️ فوروارد از ' + esc(m.forwardedFrom || 'کاربر') + '</div>';
            if (m.reply) h += '<div class="reply-box"><strong>' + esc(m.reply.name) + '</strong><br>' + esc(m.reply.text) + '</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.voice) h += renderVoiceHtml(m, mine);
            if (m.fileData) h += renderFileHtml(m);
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            if (m.reacts && Object.keys(m.reacts).length > 0) {
                h += '<div class="reacts">';
                var rc = {}; Object.values(m.reacts).forEach(function(r){ rc[r] = (rc[r]||0)+1; });
                Object.keys(rc).forEach(function(r){ h += '<span>' + r + ' ' + rc[r] + '</span>'; });
                h += '</div>';
            }
            var tick = '';
            if (mine) {
                if (m.read) tick = ' <span class="tick read">✓✓</span>';
                else if (m.delivered) tick = ' <span class="tick delivered">✓✓</span>';
                else tick = ' <span class="tick sent">✓</span>';
            }
            var editedTag = m.edited ? ' <span class="edited-tag">(ویرایش‌شده)</span>' : '';
            h += '<div class="meta">' + (m.timeStr||'') + editedTag + tick + '</div>';
            div.innerHTML = h;
            div.onclick = (function(msg,k){ return function(){ openMM(msg, k, 'private/' + cid); }; })(m, k);
            a.appendChild(div);

            if (!mine && !m.delivered) db.ref('private/' + cid + '/' + k).update({ delivered: true });
            if (!mine && !m.read) db.ref('private/' + cid + '/' + k).update({ read: true, readAt: Date.now() });
        });
        a.scrollTop = a.scrollHeight;
    });
}

// ============================================================
// Send Message
// ============================================================
document.getElementById('sendBtn').onclick = sendMsg;
document.getElementById('msgInput').onkeypress = function(e){ if (e.key === 'Enter') sendMsg(); };
document.getElementById('msgInput').oninput = function(){
    if (curChat === 'public') return;
    if (curChat.indexOf('group_') === 0) {
        setTyping('group_' + curChat.replace('group_',''), true);
    } else if (curChat) {
        setTyping('private_' + [myId, curChat].sort().join('_'), true);
    }
};

function sendMsg(){
    if (editingMsg) { commitEdit(); return; }
    var inp = document.getElementById('msgInput');
    var t = inp.value.trim();
    if (!t || !myName) return;
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    var md = {
        name: myName, uid: myId, avatar: myAv, text: t,
        time: Date.now(), timeStr: ts, read: false, delivered: false
    };
    if (replyTo) md.reply = {name:replyTo.name, text:replyTo.text};

    if (curChat === "public") {
        db.ref('messages').push(md);
        logEvent('msg_new', myId, myName, myAv, t);
    } else if (curChat.indexOf('group_') === 0) {
        var gid = curChat.replace('group_','');
        db.ref('groupmessages/' + gid).push(md);
        setTyping('group_' + gid, false);
    } else {
        var cid = [myId, curChat].sort().join('_');
        md.sender = myId;
        db.ref('private/' + cid).push(md);
        setTyping('private_' + cid, false);
    }
    inp.value = '';
    cancelReply();
}

// ============================================================
// Photo
// ============================================================
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
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            var compressed = canvas.toDataURL('image/jpeg', 0.6);
            var n = new Date();
            var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
            var md = { name:myName, uid:myId, avatar:myAv, photo:compressed, text:'', time:Date.now(), timeStr:ts, read:false, delivered:false };
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

// ============================================================
// File Sending
// ============================================================
document.getElementById('fileInput').onchange = function(e){
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از ۳ مگابایت باشه');
        e.target.value = '';
        return;
    }
    var reader = new FileReader();
    reader.onload = function(ev){
        var n = new Date();
        var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
        var md = {
            name: myName, uid: myId, avatar: myAv,
            fileData: ev.target.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            text: '', time: Date.now(), timeStr: ts,
            read: false, delivered: false
        };
        if (curChat === "public") {
            db.ref('messages').push(md);
        } else if (curChat.indexOf('group_') === 0) {
            var gid = curChat.replace('group_','');
            db.ref('groupmessages/' + gid).push(md);
        } else {
            var cid = [myId, curChat].sort().join('_');
            md.sender = myId;
            db.ref('private/' + cid).push(md);
        }
        showToast('📎 فایل ارسال شد');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
};

function renderFileHtml(m) {
    var icon = '📄';
    var t = (m.fileType || '').toLowerCase();
    if (t.indexOf('pdf') >= 0) icon = '📕';
    else if (t.indexOf('word') >= 0 || t.indexOf('document') >= 0) icon = '📘';
    else if (t.indexOf('excel') >= 0 || t.indexOf('sheet') >= 0) icon = '📗';
    else if (t.indexOf('zip') >= 0 || t.indexOf('rar') >= 0) icon = '🗜️';
    else if (t.indexOf('video') >= 0) icon = '🎬';
    else if (t.indexOf('audio') >= 0) icon = '🎵';
    else if (t.indexOf('image') >= 0) icon = '🖼️';

    var size = m.fileSize || 0;
    var sizeStr = size < 1024 ? size + ' B'
        : size < 1048576 ? (size/1024).toFixed(1) + ' KB'
        : (size/1048576).toFixed(2) + ' MB';

    return '<div class="file-msg">' +
        '<div class="f-ic">' + icon + '</div>' +
        '<div class="f-info">' +
            '<div class="f-name">' + esc(m.fileName || 'file') + '</div>' +
            '<div class="f-size">' + sizeStr + '</div>' +
        '</div>' +
        '<button class="f-dl" onclick="downloadFile(this)" ' +
        'data-src="' + m.fileData + '" ' +
        'data-name="' + esc(m.fileName || 'file') + '">⬇️</button>' +
    '</div>';
}

function downloadFile(btn){
    var src = btn.getAttribute('data-src');
    var name = btn.getAttribute('data-name');
    var a = document.createElement('a');
    a.href = src;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ============================================================
// Voice Recording
// ============================================================
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('مرورگرت ضبط صدا رو پشتیبانی نمی‌کنه');
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recSeconds = 0;

        mediaRecorder.ondataavailable = function(e){
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.onstop = function(){
            stream.getTracks().forEach(function(t){ t.stop(); });
            var blob = new Blob(audioChunks, { type: 'audio/webm' });
            if (blob.size < 1000) return;
            var reader = new FileReader();
            reader.onloadend = function(){
                sendVoiceMessage(reader.result, recSeconds);
            };
            reader.readAsDataURL(blob);
        };
        mediaRecorder.start();

        document.getElementById('recBar').classList.add('show');
        document.getElementById('recTime').textContent = '00:00';

        recTimer = setInterval(function(){
            recSeconds++;
            var m = Math.floor(recSeconds / 60);
            var s = recSeconds % 60;
            document.getElementById('recTime').textContent =
                (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            if (recSeconds >= 120) stopRecording(true);
        }, 1000);
    }).catch(function(err){
        console.error(err);
        alert('❌ دسترسی به میکروفون امکان‌پذیر نیست');
    });
}

function stopRecording(send) {
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    document.getElementById('recBar').classList.remove('show');
    if (!mediaRecorder) return;
    if (!send) audioChunks = [];
    try { mediaRecorder.stop(); } catch(e){}
    mediaRecorder = null;
}

function sendVoiceMessage(base64, duration) {
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    var md = {
        name: myName, uid: myId, avatar: myAv,
        voice: base64, voiceDur: duration,
        text: '', time: Date.now(), timeStr: ts,
        read: false, delivered: false
    };
    if (curChat === "public") {
        db.ref('messages').push(md);
    } else if (curChat.indexOf('group_') === 0) {
        var gid = curChat.replace('group_','');
        db.ref('groupmessages/' + gid).push(md);
    } else {
        var cid = [myId, curChat].sort().join('_');
        md.sender = myId;
        db.ref('private/' + cid).push(md);
    }
    showToast('🎤 پیام صوتی ارسال شد');
}

function renderVoiceHtml(m, isMine) {
    var dur = m.voiceDur || 0;
    var bars = 28;
    var wave = '';
    for (var i = 0; i < bars; i++) {
        var h = 6 + Math.floor(Math.random() * 18);
        wave += '<span style="height:' + h + 'px"></span>';
    }
    var mss = (dur < 10 ? '0' : '') + Math.floor(dur/60);
    var sss = (dur % 60 < 10 ? '0' : '') + (dur % 60);
    return '<div class="voice-msg" data-src="' + m.voice + '">' +
        '<button class="play-btn" onclick="playVoice(this)">▶</button>' +
        '<div class="wave">' + wave + '</div>' +
        '<span class="dur">' + mss + ':' + sss + '</span>' +
    '</div>';
}

var currentAudio = null;
function playVoice(btn) {
    var wrap = btn.parentElement;
    var src = wrap.getAttribute('data-src');
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }

    var audio = new Audio(src);
    currentAudio = audio;
    btn.textContent = '⏸';
    audio.play().catch(function(e){ console.log(e); });

    var waveSpans = wrap.querySelectorAll('.wave span');
    var total = waveSpans.length;
    var idx = 0;
    var tick = setInterval(function(){
        waveSpans.forEach(function(s){ s.classList.remove('active'); });
        if (idx < total) waveSpans[idx].classList.add('active');
        idx++;
    }, 100);

    audio.onended = function(){
        clearInterval(tick);
        waveSpans.forEach(function(s){ s.classList.remove('active'); });
        btn.textContent = '▶';
        currentAudio = null;
    };
    btn.onclick = function(){
        if (audio.paused) {
            audio.play(); btn.textContent = '⏸';
        } else {
            audio.pause(); btn.textContent = '▶';
        }
    };
}

// ============================================================
// Search
// ============================================================
function openSearch(){
    document.getElementById('searchPanel').classList.add('show');
    setTimeout(function(){ document.getElementById('searchInput').focus(); }, 100);
}

function closeSearch(){
    document.getElementById('searchPanel').classList.remove('show');
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('#messagesArea .msg').forEach(function(el){
        el.classList.remove('highlight');
        el.classList.remove('dim');
    });
    searchMatches = [];
    searchIdx = -1;
    document.getElementById('searchInfo').textContent = '';
}

function doSearch(q){
    var msgs = document.querySelectorAll('#messagesArea .msg');
    searchMatches = [];
    if (!q.trim()) {
        msgs.forEach(function(el){ el.classList.remove('highlight','dim'); });
        document.getElementById('searchInfo').textContent = '';
        return;
    }
    var lq = q.toLowerCase();
    msgs.forEach(function(el){
        var t = (el.textContent || '').toLowerCase();
        if (t.indexOf(lq) >= 0) {
            el.classList.add('highlight');
            el.classList.remove('dim');
            searchMatches.push(el);
        } else {
            el.classList.remove('highlight');
            el.classList.add('dim');
        }
    });
    if (searchMatches.length > 0) {
        searchIdx = searchMatches.length - 1;
        searchMatches[searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('searchInfo').textContent =
            (searchIdx + 1) + ' از ' + searchMatches.length;
    } else {
        document.getElementById('searchInfo').textContent = 'چیزی پیدا نشد';
        searchIdx = -1;
    }
}

function searchNext(dir){
    if (searchMatches.length === 0) return;
    searchIdx += dir;
    if (searchIdx < 0) searchIdx = searchMatches.length - 1;
    if (searchIdx >= searchMatches.length) searchIdx = 0;
    searchMatches[searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('searchInfo').textContent =
        (searchIdx + 1) + ' از ' + searchMatches.length;
}

// ============================================================
// Edit Message
// ============================================================
function editMessage(){
    if (!selMsg || !selKey) return;
    if (selMsg.sender !== myId && selMsg.uid !== myId) {
        alert('فقط پیام‌های خودت رو می‌تونی ویرایش کنی');
        closeMMenu();
        return;
    }
    if (!selMsg.text) {
        alert('فقط پیام‌های متنی قابل ویرایش هستن');
        closeMMenu();
        return;
    }
    editingMsg = { msg: selMsg, key: selKey, path: selPath };
    var inp = document.getElementById('msgInput');
    inp.value = selMsg.text;
    inp.focus();
    document.getElementById('sendBtn').innerHTML = '✔️';
    showToast('✏️ در حال ویرایش...');
    closeMMenu();
}

function commitEdit(){
    if (!editingMsg) return false;
    db.ref(editingMsg.path + '/' + editingMsg.key).update({
        text: document.getElementById('msgInput').value.trim(),
        edited: true
    });
    editingMsg = null;
    document.getElementById('sendBtn').innerHTML = '➤';
    document.getElementById('msgInput').value = '';
    return true;
}

// ============================================================
// Forward
// ============================================================
function forwardMessage(){
    if (!selMsg || !selKey) return;
    fwdMsg = selMsg;
    var ov = document.getElementById('fwdOverlay');
    ov.classList.add('show');
    var list = document.getElementById('fwdList');
    list.innerHTML = '';

    var pub = document.createElement('div');
    pub.className = 'fwd-item';
    pub.innerHTML = '<div class="av">💬</div><div class="name">گروه عمومی</div><div class="go">›</div>';
    pub.onclick = function(){ doForward('public', null); };
    list.appendChild(pub);

    Object.keys(allUsers).forEach(function(uid){
        if (uid === myId) return;
        var u = allUsers[uid];
        var it = document.createElement('div');
        it.className = 'fwd-item';
        it.innerHTML = '<div class="av">' + (u.avatar||'👤') + '</div><div class="name">' + esc(u.name) + '</div><div class="go">›</div>';
        it.onclick = function(){ doForward(uid, u); };
        list.appendChild(it);
    });

    db.ref('groups').once('value', function(s){
        var d = s.val() || {};
        Object.keys(d).forEach(function(gid){
            var g = d[gid];
            if (!g.members || !g.members[myId]) return;
            var it = document.createElement('div');
            it.className = 'fwd-item';
            it.innerHTML = '<div class="av">👥</div><div class="name">' + esc(g.name) + '</div><div class="go">›</div>';
            it.onclick = function(){ doForward('group_' + gid, null); };
            list.appendChild(it);
        });
    });

    closeMMenu();
}

function closeFwd(){
    document.getElementById('fwdOverlay').classList.remove('show');
    fwdMsg = null;
}

function doForward(target, userData){
    if (!fwdMsg) return;
    var n = new Date();
    var ts = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    var md = {
        name: myName, uid: myId, avatar: myAv,
        text: fwdMsg.text || '',
        photo: fwdMsg.photo || null,
        voice: fwdMsg.voice || null,
        voiceDur: fwdMsg.voiceDur || 0,
        fileData: fwdMsg.fileData || null,
        fileName: fwdMsg.fileName || null,
        fileSize: fwdMsg.fileSize || 0,
        fileType: fwdMsg.fileType || null,
        forwarded: true,
        forwardedFrom: fwdMsg.name || 'کاربر',
        time: Date.now(), timeStr: ts,
        read: false, delivered: false
    };

    if (target === 'public') {
        db.ref('messages').push(md);
    } else if (target.indexOf('group_') === 0) {
        var gid = target.replace('group_','');
        db.ref('groupmessages/' + gid).push(md);
    } else {
        var cid = [myId, target].sort().join('_');
        md.sender = myId;
        db.ref('private/' + cid).push(md);
    }
    showToast('↪️ فوروارد شد');
    closeFwd();
}

function deleteChat(chatKey){
    if (!confirm('کل این چت پاک بشه؟ برگشت‌پذیر نیست!')) return;
    db.ref(chatKey).remove();
    showToast('🗑️ چت حذف شد');
    document.querySelector('.tbtn[data-tab="pageChats"]').click();
    setTimeout(function(){ loadChatsList(); }, 500);
}

// ============================================================
// Groups
// ============================================================
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

function openGroup(gid, name){
    curChat = 'group_' + gid;
    curUser = {id:gid, name:name, isGroup:true};
    markChatAsRead('groupmessages/' + gid);
    document.getElementById('headerTitle').textContent = '👥 ' + name;
    document.getElementById('headerStatus').textContent = 'گروه';
    document.getElementById('backBtn').style.display = 'block';
    showPage('pageChat');
    var a = document.getElementById('messagesArea');
    db.ref('groupmessages/' + gid).limitToLast(100).on('value', function(s){
        a.innerHTML = '';
        var d = s.val();
        if (!d) { a.innerHTML = '<div class="empty">هنوز پیامی نیست!</div>'; return; }
        var ks = Object.keys(d).sort(function(x,y){ return (d[x].time||0) - (d[y].time||0); });
        ks.forEach(function(k){
            var m = d[k], mine = (m.uid === myId) || (m.name === myName && !m.uid);
            var div = document.createElement('div');
            div.className = 'msg ' + (mine ? 'sent' : 'rec');
            var h = '';
            if (!mine) h += '<div class="sender">' + m.avatar + ' ' + esc(m.name) + '</div>';
            if (m.forwarded) h += '<div class="fwd-tag">↪️ فوروارد</div>';
            if (m.photo) h += '<img class="photo" src="' + m.photo + '">';
            if (m.voice) h += renderVoiceHtml(m, mine);
            if (m.fileData) h += renderFileHtml(m);
            if (m.text) h += '<div class="text">' + esc(m.text) + '</div>';
            var editedTag = m.edited ? ' <span class="edited-tag">(ویرایش‌شده)</span>' : '';
            h += '<div class="meta">' + (m.timeStr||'') + editedTag + '</div>';
            div.innerHTML = h;
            div.onclick = (function(msg,k){ return function(){ openMM(msg, k, 'groupmessages/' + gid); }; })(m, k);
            a.appendChild(div);
        });
        a.scrollTop = a.scrollHeight;
    });
    showTypingIndicator('group_' + gid);
}

// ============================================================
// Message Menu
// ============================================================
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
    var canDel = (m.name === myName || m.sender === myId || m.uid === myId || isAdmin);
    document.getElementById('delBtn').style.display = canDel ? 'block' : 'none';

    var canEdit = (m.sender === myId || m.uid === myId) && m.text;
    var eb = document.getElementById('editBtn');
    if (eb) eb.style.display = canEdit ? 'block' : 'none';
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
    replyTo = { name: selMsg.name || 'کاربر', text: selMsg.text || '📷 عکس' };
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
    navigator.clipboard.writeText(t).then(function(){ showToast('📋 کپی شد'); }).catch(function(){ showToast('نشد'); });
    closeMMenu();
}

function deleteMsg(){
    if (!selMsg || !selKey) return;
    if (confirm('حذف بشه؟')) db.ref(selPath + '/' + selKey).remove();
    closeMMenu();
}

// ============================================================
// Contacts
// ============================================================
function loadUsers(){
    var l = document.getElementById('usersList');
    if (!l) return;

    db.ref('users').on('value', function(s){
        l.innerHTML = '';
        var d = s.val() || {};
        var arr = [];

        Object.keys(d).forEach(function(uid){
            if (uid === myId) return;
            var u = d[uid];
            allUsers[uid] = u;
            arr.push({
                uid: uid,
                name: u.name || 'کاربر',
                avatar: u.avatar || '👤',
                isAdmin: u.isAdmin
            });
        });

        arr.sort(function(a,b){ return (a.name || '').localeCompare(b.name || '', 'fa'); });

        if (arr.length === 0) {
            l.innerHTML = '<div class="empty"><span class="big">👤</span>هنوز مخاطبی نیست</div>';
            return;
        }

        var onlineCount = 0;
        var pending = arr.length;

        arr.forEach(function(c){
            db.ref('status/' + c.uid).once('value', function(stSnap){
                var st = stSnap.val() || {};
                var isOnline = st.state === 'online';
                if (isOnline) onlineCount++;

                var badge = c.isAdmin ? ' <span class="admin-badge">✅</span>' : '';
                var statusText = isOnline
                    ? '<span style="color:#00e5a0">● آنلاین</span>'
                    : (st.lastChanged ? 'آخرین بازدید ' + timeAgo(st.lastChanged) : 'آفلاین');

                var div = document.createElement('div');
                div.className = 'citem';
                div.innerHTML =
                    '<div class="av">' + c.avatar + (isOnline ? '<span class="dot"></span>' : '') + '</div>' +
                    '<div class="body">' +
                        '<h3>' + esc(c.name) + badge + '</h3>' +
                        '<p style="font-size:12px;color:#7a8aa8">' + statusText + '</p>' +
                    '</div>';
                div.onclick = function(){ openPriv(c.uid, c.name, c.avatar); };
                l.appendChild(div);

                pending--;
                if (pending === 0) {
                    var el = document.getElementById('statUsrs');
                    if (el) el.textContent = onlineCount;
                }
            });
        });
    });
}

function loadMyCount(){
    db.ref('messages').on('value', function(s){
        var d = s.val();
        if (d) {
            var c = 0;
            Object.keys(d).forEach(function(k){ if (d[k].uid === myId || d[k].name === myName) c++; });
            var el = document.getElementById('statMsgs');
            if (el) el.textContent = c;
        }
    });
}

// ============================================================
// Emoji / Tabs / Theme
// ============================================================
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
        if (t === 'pageChats') {
            document.getElementById('headerTitle').textContent = 'سوپر اپ';
            unreadCounts = {}; unreadTotal = 0; updateTotalBadge();
        }
        else if (t === 'pageBrowser') document.getElementById('headerTitle').textContent = 'مرورگر';
        else if (t === 'pageUsers') document.getElementById('headerTitle').textContent = 'مخاطبین';
        else document.getElementById('headerTitle').textContent = 'پروفایل';
    };
});
document.getElementById('backBtn').onclick = function(){ document.querySelector('.tbtn[data-tab="pageChats"]').click(); };
function showPage(id){
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('act'); });
    document.getElementById(id).classList.add('act');
}

// ============================================================
// Profile Edit
// ============================================================
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
            s.style.background = 'rgba(0,229,255,0.3)';
            tmp = s.getAttribute('data-av');
        };
    });
    window._tmpAv = function(){ return tmp; };
    document.getElementById('modal').classList.add('show');
}
function saveAvatar(){
    myAv = window._tmpAv();
    localStorage.setItem('app_av', myAv);
    if (myId) db.ref('users/' + myId).update({ avatar: myAv });
    updateAv();
    initPresence();
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
    if (myId) db.ref('users/' + myId).update({ name: myName });
    updateAv();
    initPresence();
    closeModal();
}

function showAbout(){
    var mb = document.getElementById('mbox');
    mb.innerHTML = '<h3>ℹ️ درباره سوپر اپ</h3><p style="color:#8696a0;line-height:2;font-size:13px">👨‍💻 محمد علی نیسی<br><br>✨ امکانات:<br>• چت عمومی و خصوصی<br>• گروه‌سازی<br>• 📷 عکس / 🎤 ویس / 📎 فایل<br>• 🔍 جستجو در پیام‌ها<br>• ✏️ ویرایش و ↪️ فوروارد<br>• 🔔 اعلان‌ها + Badge<br>• ✓✓ تیک پیام<br>• ⌨️ در حال تایپ<br>• 🖼️ آواتار سفارشی<br>• 🎨 ۴ تم رنگی<br>• 📞 تماس صوتی<br>• ✅ سیستم مدیر</p><div class="acts"><button class="p" onclick="closeModal()">بستن</button></div>';
    document.getElementById('modal').classList.add('show');
}

function closeModal(){ document.getElementById('modal').classList.remove('show'); }

// ============================================================
// Logout
// ============================================================
document.getElementById('logoutBtn').onclick = async function(){
    if (confirm('خارج می‌شی؟')) {
        if (myId) db.ref('online/' + myId).remove();
        localStorage.removeItem('app_name');
        localStorage.removeItem('app_id');
        localStorage.removeItem('app_av');
        localStorage.removeItem('app_admin');
        localStorage.removeItem('app_phone');
        try { await auth.signOut(); } catch(e) {}
        location.reload();
    }
};

// ============================================================
// Search & Browser
// ============================================================
document.getElementById('searchUser').oninput = function(e){
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('#usersList .citem').forEach(function(it){
        var n = it.querySelector('h3').textContent.toLowerCase();
        it.style.display = n.includes(q) ? 'flex' : 'none';
    });
};
document.getElementById('searchChat').oninput = function(e){
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('#chatList .citem').forEach(function(it){
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

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
function playNotifSound() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var now = ctx.currentTime;
        [880, 1320].forEach(function(freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.20);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.25);
        });
        setTimeout(function(){ try { ctx.close(); } catch(e){} }, 800);
    } catch(e) {}
}

function vibrateNotif() {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function showBrowserNotif(title, body) {
    if (!notifPermGranted) return;
    if (document.visibilityState === 'visible') return;
    try {
        var n = new Notification(title, {
            body: body,
            icon: '/quran-app/icon-192.png',
            dir: 'rtl'
        });
        n.onclick = function(){ window.focus(); n.close(); };
        setTimeout(function(){ n.close(); }, 5000);
    } catch(e) {}
}

function showToast(text) {
    var t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

function updateBadge(tabId, count) {
    var btn = document.querySelector('.tbtn[data-tab="' + tabId + '"]');
    if (!btn) return;
    var old = btn.querySelector('.badge');
    if (old) old.remove();
    if (count > 0) {
        var b = document.createElement('span');
        b.className = 'badge';
        b.textContent = count > 99 ? '99+' : count;
        btn.appendChild(b);
    }
}

function updateTotalBadge() {
    updateBadge('pageChats', unreadTotal);
}

function showNotifBanner2(title, text, avatar, onClick) {
    var b = document.getElementById('notifBanner');
    if (!b) return;

    document.getElementById('notifAv').textContent = avatar || '💬';
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifText').textContent = text;

    b.classList.add('show');
    b.onclick = function(){
        b.classList.remove('show');
        if (typeof onClick === 'function') onClick();
    };
    clearTimeout(b._to);
    b._to = setTimeout(function(){ b.classList.remove('show'); }, 4000);
}

function isCurrentChat(chatKey) {
    if (!curChat) return false;
    if (curChat === 'public' && chatKey === 'messages') return true;
    if (curChat.indexOf('group_') === 0 && chatKey === 'groupmessages/' + curChat.replace('group_','')) return true;
    if (chatKey.indexOf('private/') === 0) {
        var cid = chatKey.replace('private/','');
        var myCid = [myId, curChat].sort().join('_');
        return cid === myCid;
    }
    return false;
}

function handleIncomingMessage(m, chatKey) {
    if (!m) return;
    if (m.uid === myId || m.sender === myId) return;
    if (m.name === myName && !m.uid) return;

    var chatOpen = isCurrentChat(chatKey);
    var pageChatVisible = document.getElementById('pageChat').classList.contains('act') && chatOpen;

    if (pageChatVisible && document.visibilityState === 'visible') {
        playNotifSound();
        return;
    }

    unreadCounts[chatKey] = (unreadCounts[chatKey] || 0) + 1;
    unreadTotal++;
    updateTotalBadge();

    var preview = m.text || '';
    if (m.photo) preview = '📷 عکس';
    else if (m.voice) preview = '🎤 پیام صوتی';
    else if (m.fileData) preview = '📎 ' + (m.fileName || 'فایل');
    if (!preview) preview = '📨 پیام جدید';

    var title = m.name || 'کاربر';
    if (chatKey === 'messages') title = '📢 ' + title;
    else if (chatKey.indexOf('groupmessages/') === 0) title = '👥 ' + title;

    playNotifSound();
    vibrateNotif();

    if (document.visibilityState === 'visible') {
        showNotifBanner2(title, preview, m.avatar, function(){
            openChatFromNotif(chatKey);
        });
    } else {
        showBrowserNotif(title, preview);
    }
}

function openChatFromNotif(chatKey) {
    if (chatKey === 'messages') {
        var pub = document.getElementById('publicChatItem');
        if (pub) pub.click();
    } else if (chatKey.indexOf('groupmessages/') === 0) {
        var gid = chatKey.replace('groupmessages/','');
        db.ref('groups/' + gid).once('value', function(s){
            var g = s.val();
            if (g) openGroup(gid, g.name);
        });
    } else if (chatKey.indexOf('private/') === 0) {
        var cid = chatKey.replace('private/','');
        var parts = cid.split('_');
        var otherId = parts[0] === myId ? parts[1] : parts[0];
        db.ref('users/' + otherId).once('value', function(s){
            var u = s.val() || {};
            openPriv(otherId, u.name || 'کاربر', u.avatar || '👤');
        });
    }
    unreadCounts[chatKey] = 0;
    updateTotalBadge();
}

function listenAllPrivateMessages() {
    db.ref('private').on('child_added', function(cidSnap){
        var cid = cidSnap.key;
        var parts = cid.split('_');
        if (parts.indexOf(myId) === -1) return;

        db.ref('private/' + cid).limitToLast(1).on('child_added', function(msgSnap){
            var m = msgSnap.val();
            handleIncomingMessage(m, 'private/' + cid);
        });
    });
}

function listenAllGroupMessages() {
    db.ref('groups').on('child_added', function(gSnap){
        var gid = gSnap.key;
        var g = gSnap.val();
        if (!g.members || !g.members[myId]) return;

        db.ref('groupmessages/' + gid).limitToLast(1).on('child_added', function(mSnap){
            var m = mSnap.val();
            handleIncomingMessage(m, 'groupmessages/' + gid);
        });
    });
}

function listenPublicMessages() {
    db.ref('messages').limitToLast(1).on('child_added', function(mSnap){
        var m = mSnap.val();
        handleIncomingMessage(m, 'messages');
    });
}

function markChatAsRead(chatKey) {
    if (!unreadCounts[chatKey]) return;
    unreadTotal = Math.max(0, unreadTotal - unreadCounts[chatKey]);
    unreadCounts[chatKey] = 0;
    updateTotalBadge();
}

function initNotificationSystem() {
    if ('Notification' in window && Notification.permission === 'granted') {
        notifPermGranted = true;
    }

    listenPublicMessages();
    listenAllPrivateMessages();
    listenAllGroupMessages();
}

// ============================================================
// Notification Banner wrapper (سازگاری با FCM)
// ============================================================
function showNotifBanner(title, text) {
    showNotifBanner2(title, text, '💬', null);
}

// ============================================================
// Notification Banner (قدیمی - نگه داشته شده برای سازگاری)
// ============================================================
function listenAllEvents(){
    db.ref('online').on('child_added', function(snap) {
        var u = snap.val();
        if (!u || snap.key === myId) return;
        var diff = Date.now() - (u.time || 0);
        if (diff < 10000 && isAdmin) {
            showToast('👤 ' + u.name + ' آنلاین شد');
        }
    });
}

// ============================================================
// Utility
// ============================================================
function timeAgo(time){
    if (!time) return 'خیلی وقت پیش';
    var diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 60) return 'همین الان';
    if (diff < 3600) return Math.floor(diff/60) + ' دقیقه پیش';
    if (diff < 86400) return Math.floor(diff/3600) + ' ساعت پیش';
    if (diff < 2592000) return Math.floor(diff/86400) + ' روز پیش';
    if (diff < 31536000) return Math.floor(diff/2592000) + ' ماه پیش';
    return Math.floor(diff/31536000) + ' سال پیش';
}

function timeAgoShort(time){
    if (!time) return '';
    var diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 60) return 'الان';
    if (diff < 3600) return Math.floor(diff/60) + 'د';
    if (diff < 86400) return Math.floor(diff/3600) + 'س';
    if (diff < 604800) return Math.floor(diff/86400) + 'ر';
    var d = new Date(time);
    return d.getDate() + '/' + (d.getMonth()+1);
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
    var names = {'theme-green':'🟢 سبز نئون','theme-blue':'🔵 آبی شفق','theme-purple':'🟣 بنفش کیهانی','theme-red':'🔴 قرمز آتش'};
    var h = '<h3>🎨 انتخاب تم</h3>';
    themes.forEach(function(t){
        h += '<div onclick="setTheme(\''+t+'\');closeModal()" style="background:rgba(30,40,65,0.7);padding:15px;border-radius:10px;margin-bottom:8px;cursor:pointer">' + names[t] + '</div>';
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

// ============================================================
// WebRTC Voice Call
// ============================================================
function startCall(peerId, peerName, peerAvatar) {
    if (pc) { alert('شما در حال حاضر در یک تماس هستید'); return; }
    if (!peerId) { alert('کاربر معتبر نیست'); return; }

    currentCallId = 'call_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    currentCallPeer = peerId;
    isCaller = true;
    isMuted = false;

    document.getElementById('callScreen').classList.add('show');
    document.getElementById('callAvatar').textContent = peerAvatar || '👤';
    document.getElementById('callName').textContent = peerName || 'کاربر';
    document.getElementById('callStatus').textContent = 'در حال زنگ زدن...';
    document.getElementById('callActiveButtons').style.display = 'flex';
    document.getElementById('callIncomingButtons').style.display = 'none';
    document.getElementById('muteBtn').textContent = '🎤';
    document.getElementById('muteBtn').classList.remove('active');

    db.ref('calls/' + currentCallId).set({
        caller: myId, callerName: myName, callerAvatar: myAv,
        receiver: peerId, receiverName: peerName,
        status: 'ringing', time: Date.now()
    });

    initWebRTC(true);
    setCallTimeout(currentCallId);
}

function listenIncomingCalls() {
    db.ref('calls').on('child_added', function(snap) {
        var call = snap.val();
        if (!call) return;
        if (call.receiver !== myId) return;
        if (call.status !== 'ringing') return;
        if (pc) return;

        currentCallId = snap.key;
        currentCallPeer = call.caller;
        isCaller = false;
        isMuted = false;

        document.getElementById('callScreen').classList.add('show');
        document.getElementById('callAvatar').textContent = call.callerAvatar || '👤';
        document.getElementById('callName').textContent = call.callerName || 'ناشناس';
        document.getElementById('callStatus').textContent = '📞 تماس ورودی...';
        document.getElementById('callActiveButtons').style.display = 'none';
        document.getElementById('callIncomingButtons').style.display = 'flex';

        playRingtone();
    });
}

document.getElementById('acceptCallBtn').onclick = function() {
    stopRingtone();
    if (!currentCallId) return;
    document.getElementById('callIncomingButtons').style.display = 'none';
    document.getElementById('callActiveButtons').style.display = 'flex';
    document.getElementById('callStatus').textContent = 'در حال اتصال...';
    db.ref('calls/' + currentCallId).update({ status: 'accepted' });
    initWebRTC(false);
    listenCallEnd();
};

document.getElementById('rejectCallBtn').onclick = function() {
    stopRingtone();
    if (currentCallId) db.ref('calls/' + currentCallId).update({ status: 'rejected' });
    endCall();
};

document.getElementById('endCallBtn').onclick = function() {
    if (currentCallId) db.ref('calls/' + currentCallId).update({ status: 'ended' });
    endCall();
};

function endCall() {
    stopRingtone();
    if (callTimeoutHandle) { clearTimeout(callTimeoutHandle); callTimeoutHandle = null; }
    if (pc) { try { pc.close(); } catch(e) {} pc = null; }
    if (localStream) { localStream.getTracks().forEach(function(t){ t.stop(); }); localStream = null; }

    document.getElementById('callScreen').classList.remove('show');
    document.getElementById('remoteAudio').srcObject = null;

    if (currentCallId) {
        db.ref('calls/' + currentCallId + '/status').off();
        db.ref('calls/' + currentCallId + '/answer').off();
        db.ref('calls/' + currentCallId + '/offer').off();
        if (currentCallPeer) db.ref('calls/' + currentCallId + '/ice_' + currentCallPeer).off();
        db.ref('calls/' + currentCallId + '/ice_' + myId).off();
    }

    currentCallId = null; currentCallPeer = null;
    isCaller = false; isMuted = false;
}

function listenCallEnd() {
    if (!currentCallId) return;
    db.ref('calls/' + currentCallId + '/status').on('value', function(snap) {
        var s = snap.val();
        if (s === 'ended' || s === 'rejected' || s === 'missed') endCall();
    });
}

function setCallTimeout(callId) {
    callTimeoutHandle = setTimeout(function() {
        db.ref('calls/' + callId + '/status').once('value', function(snap) {
            if (snap.val() === 'ringing') {
                db.ref('calls/' + callId).update({ status: 'missed' });
                endCall();
            }
        });
    }, 30000);
}

async function initWebRTC(caller) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        pc = new RTCPeerConnection(rtcConfig);

        localStream.getTracks().forEach(function(track) { pc.addTrack(track, localStream); });

        pc.ontrack = function(event) {
            var audio = document.getElementById('remoteAudio');
            if (audio.srcObject !== event.streams[0]) {
                audio.srcObject = event.streams[0];
                audio.play().catch(function(e){ console.log('play error', e); });
            }
        };

        pc.onicecandidate = function(event) {
            if (event.candidate && currentCallId) {
                db.ref('calls/' + currentCallId + '/ice_' + myId).push(event.candidate.toJSON());
            }
        };

        pc.onconnectionstatechange = function() {
            if (!pc) return;
            if (pc.connectionState === 'connected') {
                document.getElementById('callStatus').textContent = '⏱️ در حال صحبت...';
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                if (currentCallId) db.ref('calls/' + currentCallId).update({ status: 'ended' });
                endCall();
            }
        };

        if (caller) {
            var offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            db.ref('calls/' + currentCallId + '/offer').set({ sdp: offer.sdp, type: offer.type });
            db.ref('calls/' + currentCallId + '/answer').on('value', async function(snap) {
                var answer = snap.val();
                if (answer && pc && pc.signalingState !== 'stable') {
                    try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); }
                    catch(e) {}
                }
            });
        } else {
            db.ref('calls/' + currentCallId + '/offer').once('value', async function(snap) {
                var offer = snap.val();
                if (!offer) return;
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                var answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                db.ref('calls/' + currentCallId + '/answer').set({ sdp: answer.sdp, type: answer.type });
            });
        }

        if (currentCallPeer) {
            db.ref('calls/' + currentCallId + '/ice_' + currentCallPeer).on('child_added', function(snap) {
                var candidate = snap.val();
                if (candidate && pc && pc.remoteDescription) {
                    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(function(e) {});
                }
            });
        }
    } catch (err) {
        console.error('WebRTC Error:', err);
        alert('❌ دسترسی به میکروفون امکان‌پذیر نیست.');
        if (currentCallId) db.ref('calls/' + currentCallId).update({ status: 'ended' });
        endCall();
    }
}

document.getElementById('muteBtn').onclick = function() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(function(t) { t.enabled = !isMuted; });
    this.classList.toggle('active', isMuted);
    this.textContent = isMuted ? '🔇' : '🎤';
};

function playRingtone() {
    try {
        ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ringtoneCtx.createOscillator();
        var gain = ringtoneCtx.createGain();
        osc.connect(gain);
        gain.connect(ringtoneCtx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ringtoneCtx.currentTime + 30);
    } catch(e) {}
}
function stopRingtone() {
    if (ringtoneCtx) { try { ringtoneCtx.close(); } catch(e) {} ringtoneCtx = null; }
}

function addCallButton() {
    var header = document.getElementById('header');
    if (!header) return;
    if (document.getElementById('callBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'callBtn';
    btn.innerHTML = '📞';
    btn.title = 'تماس صوتی';
    btn.onclick = function() {
        if (curChat === 'public' || !curUser || curUser.isGroup) {
            alert('فقط در چت خصوصی می‌تونی تماس بگیری');
            return;
        }
        startCall(curUser.id, curUser.name, curUser.avatar);
    };
    header.appendChild(btn);
}
