var currentLessonIndex = 0;
var quizIndex = 0;
var quizScore = 0;

function showPage(id) {
    var pages = ['home', 'lessons', 'lessonView', 'quiz', 'about'];
    for (var i = 0; i < pages.length; i++) {
        document.getElementById(pages[i]).classList.add('hidden');
    }
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0, 0);
    if (id === 'lessons') renderLessons();
    if (id === 'quiz') startQuiz();
}

function renderLessons() {
    var html = '';
    for (var i = 0; i < lessons.length; i++) {
        html += '<div class="lesson-item" onclick="openLesson(' + i + ')">';
        html += '<span class="lesson-num">' + (i+1) + '</span>';
        html += '<span class="lesson-title">' + lessons[i].title + '</span>';
        html += '<div class="lesson-desc">' + lessons[i].desc + '</div>';
        html += '</div>';
    }
    document.getElementById('lessonList').innerHTML = html;
}

function openLesson(idx) {
    currentLessonIndex = idx;
    document.getElementById('lessonTitle').textContent = 'درس ' + (idx+1) + ': ' + lessons[idx].title;
    document.getElementById('lessonContent').innerHTML = lessons[idx].html;
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = (idx === 0);
    prevBtn.style.opacity = (idx === 0) ? '0.5' : '1';
    nextBtn.disabled = (idx === lessons.length - 1);
    nextBtn.style.opacity = (idx === lessons.length - 1) ? '0.5' : '1';
    showPage('lessonView');
}

function prevLesson() {
    if (currentLessonIndex > 0) openLesson(currentLessonIndex - 1);
}

function nextLesson() {
    if (currentLessonIndex < lessons.length - 1) openLesson(currentLessonIndex + 1);
}

function startQuiz() {
    quizIndex = 0;
    quizScore = 0;
    loadQuiz();
}

function loadQuiz() {
    if (quizIndex >= quizData.length) {
        showResult();
        return;
    }
    var q = quizData[quizIndex];
    document.getElementById('quizInfo').textContent = 'سوال ' + (quizIndex + 1) + ' از ' + quizData.length;
    var html = '<div class="card"><p style="font-size:1.1em;margin-bottom:15px"><strong>' + q.q + '</strong></p>';
    for (var i = 0; i < q.opts.length; i++) {
        html += '<button onclick="answer(' + i + ', this)">' + q.opts[i] + '</button>';
    }
    html += '</div>';
    document.getElementById('quizContent').innerHTML = html;
}

function answer(selected, btn) {
    var q = quizData[quizIndex];
    var buttons = document.querySelectorAll('#quizContent button');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }
    if (selected === q.correct) {
        btn.style.background = '#2ea043';
        quizScore += 10;
    } else {
        btn.style.background = '#f85149';
        buttons[q.correct].style.background = '#2ea043';
    }
    setTimeout(function() {
        quizIndex++;
        loadQuiz();
    }, 1200);
}

function showResult() {
    var maxScore = quizData.length * 10;
    var percent = Math.round((quizScore / maxScore) * 100);
    var message = '';
    if (percent === 100) message = '🎉 عالی! استاد پایتون هستید!';
    else if (percent >= 80) message = '🌟 خیلی خوب!';
    else if (percent >= 60) message = '👍 خوب بود!';
    else if (percent >= 40) message = '📚 قابل قبول!';
    else message = '💪 با تمرین بهتر می‌شی!';
    var html = '<div class="card" style="text-align:center">';
    html += '<div style="font-size:3em;color:#ffd43b;margin:20px 0">' + quizScore + '</div>';
    html += '<div style="color:#7d8590;margin-bottom:20px">از ' + maxScore + '</div>';
    html += '<p style="font-size:1.1em">' + message + '</p>';
    html += '</div>';
    html += '<button class="green" onclick="startQuiz()">🔄 آزمون دوباره</button>';
    document.getElementById('quizContent').innerHTML = html;
    document.getElementById('quizInfo').textContent = 'پایان - ' + percent + '٪';
}

console.log('✅ آماده است');
