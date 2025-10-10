const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 逆プロキシ（Codespaces/Heroku等）経由のHTTPSで secure cookie を使うとき
app.set('trust proxy', 1);

// POST body 解析
app.use(express.urlencoded({ extended: true }));

// ===== セッション設定（本番は Redis/Mongo などのストアに置き換え推奨） =====
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'change-me-please',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,           // JS から読めない
    sameSite: 'lax',          // CSRF 耐性
    secure: false,            // 本番HTTPSなら true に
    maxAge: 1000 * 60 * 60    // 1時間
  }
}));

// ===== ダミーユーザー（パスワードはハッシュで保存） =====
// 実際はDBに保存。下の hashSync はサンプル用（本番は登録時に hash）。
const users = [
  {
    id: 1,
    username: 'user1',
    role: 'user',
    passwordHash: bcrypt.hashSync('password1', 12)
  },
  {
    id: 2,
    username: 'admin',
    role: 'admin',
    passwordHash: bcrypt.hashSync('admin_pass', 12)
  }
];

// ===== ミドルウェア =====
const requireAuth = (req, res, next) => {
  if (req.session.user) return next();
  return res.redirect('/login?error=1');
};

const requireAdmin = (req, res, next) => {
  if (req.session.user?.role === 'admin') return next();
  return res.status(403).send('<h1>403 Forbidden</h1><p>このページへのアクセス権がありません。</p>');
};

// ===== ルーティング =====

// ログインフォーム
app.get('/login', (req, res) => {
  const errorMessage = req.query.error ? '<p style="color:red;">ログインが必要です。</p>' : '';
  const loginFailedMessage = req.query.failed ? '<p style="color:red;">ユーザー名またはパスワードが違います。</p>' : '';
  res.send(`
    <!doctype html>
    <html lang="ja"><head><meta charset="utf-8"><title>ログイン</title></head>
    <body>
      <h1>ログイン画面</h1>
      ${errorMessage}${loginFailedMessage}
      <form action="/login" method="post">
        <div><label for="username">ユーザー名:</label>
          <input id="username" name="username" required></div>
        <div><label for="password">パスワード:</label>
          <input id="password" type="password" name="password" required></div>
        <button type="submit">ログイン</button>
      </form>
    </body></html>
  `);
});

// ログイン処理（重複を解消）
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.redirect('/login?failed=1');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.redirect('/login?failed=1');

  req.session.user = { id: user.id, username: user.username, role: user.role };
  return res.redirect('/home');
});

// ホーム
app.get('/home', requireAuth, (req, res) => {
  const username = req.session.user.username;
  res.send(`
    <!doctype html>
    <html lang="ja"><head><meta charset="utf-8"><title>ホーム</title></head>
    <body>
      <h1>ようこそ、${username} さん！</h1>
      <p>ここはログインした人だけが見れるページです。</p>
      <p><a href="/admin-panel">管理者パネルへ</a></p>
      <form action="/logout" method="post"><button type="submit">ログアウト</button></form>
    </body></html>
  `);
});

// 管理者専用
app.get('/admin-panel', requireAuth, requireAdmin, (req, res) => {
  res.send(`
    <h1>管理者パネル</h1>
    <p>ようこそ、${req.session.user.username} さん。</p>
    <p>ここは管理者だけが見れる特別なページです。</p>
    <a href="/home">ホームに戻る</a>
  `);
});

// ログアウト
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// 起動
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT} で起動中`);
});
