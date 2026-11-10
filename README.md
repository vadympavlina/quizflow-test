# QuizFlow Test (проходження тестів студентами)

Піддомен: **test.quizflow.space**. Проходження тесту студентом за посиланням (іспит, контрольна; НЕ гра): одна сторінка `index.html` (`/?link=…&t=…` — тест за посиланням викладача, `/?testId=…&preview=1&t=…` — попередній перегляд із конструктора).

Статичний сайт (без збірки) на GitHub Pages. Правила роботи з кодом — у [CLAUDE.md](CLAUDE.md), тести — у [tests/README.md](tests/README.md).

## Як підключити домен
1. DNS: `CNAME` запис `test` → `vadympavlina.github.io`.
2. GitHub: Settings → Pages → Source: **GitHub Actions**; Custom domain: `test.quizflow.space`; увімкнути Enforce HTTPS.
3. Firebase Console → Authentication → Settings → Authorized domains: додати `test.quizflow.space`.
