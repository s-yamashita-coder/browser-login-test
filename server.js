const express = require('express');
const session = require('express-session');
const app = express();
const PORT = 3000;

// POSTリクエストのボディを解析するためのミドルウェア
app.use(express.urlencoded({ extended: true }));

// セッション管理の設定
app.use(session({
  secret: 'my-secret-key', // セッションIDの署名に使うキー（実際にはもっと複雑なものに）
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // HTTPSでない場合はfalse
}));

// --- ダミーのユーザーデータ ---
const users = [
  { id: 1, username: 'user1', password: 'password1' },
  { id: 2, username: 'admin', password: 'admin_pass' }
];

// --- 認証チェック用のミドルウェア ---
const requireAuth = function(req, res, next) {
  if (req.session.user) {
    // セッションにユーザー情報があれば、次の処理へ進む
    next();
  } else {
    // なければログインページへリダイレクト
    res.redirect('/login?error=1');
  }
};


// --- ルーティング（各URLに対する処理） ---

// 1. ルート: ログインしていればホームへ、していなければログインページへ
app.get('/', function(req, res) {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.redirect('/login');
  }
});

// 2. ログイン画面を表示 (GET /login)
app.get('/login', function(req, res) {
  const errorMessage = req.query.error ? '<p style="color: red;">ログインが必要です。</p>' : '';
  const loginFailedMessage = req.query.failed ? '<p style="color: red;">ユーザー名またはパスワードが違います。</p>' : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <title>ログイン</title>
    </head>
    <body>
      <h1>ログイン画面</h1>
      ${errorMessage}
      ${loginFailedMessage}
      <form action="/login" method="post">
        <div>
          <label for="username">ユーザー名:</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div>
          <label for="password">パスワード:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">ログイン</button>
      </form>
    </body>
    </html>
  `);
});

// 3. ログイン処理 (POST /login)
app.post('/login', function(req, res) {
  const { username, password } = req.body;

  const user = users.find(function(u) {
    return u.username === username && u.password === password;
  });

  if (user) {
    req
