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
  { id: 1, username: 'user1', password: 'password1',role: 'user' },
  { id: 2, username: 'admin', password: 'admin_pass',role: 'admin' }
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

// ★★★ ここに新しい門番を追加 ★★★
const requireAdmin = function(req, res, next) {
  // セッションにユーザー情報があり、かつ、その役割が 'admin' かどうかをチェック
  if (req.session.user && req.session.user.role === 'admin') {
    next(); // 管理者なら、次の処理へ進む
  } else {
    // 管理者でなければ、エラーメッセージを表示
    res.status(403).send('<h1>403 Forbidden</h1><p>このページへのアクセス権がありません。</p>');
  }
};


// --- ルーティング（各URLに対する処理） ---

// 1. ルート: ログインしていればホームへ、していなければログインページへ(ハッシュを追加)
const bcrypt = require('bcrypt');

app.post('/login', function(req, res) {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  // ユーザーが見つかり、かつパスワードがハッシュと一致するかチェック
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    // 成功！
    req.session.user = { 
      id: user.id,
      username: user.username,
      role: user.role // ★役割もセッションに保存
    };
    res.redirect('/home');
  } else {
    // 失敗...
    res.redirect('/login?failed=1');
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
    req.session.user = {
      id: user.id,
      username: user.username
    };
    res.redirect('/home');
  } else {
    res.redirect('/login?failed=1');
  }
});

// 4. ホーム画面 (GET /home)
app.get('/home', requireAuth, function(req, res) {
  const username = req.session.user.username;

  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <title>ホーム</title>
    </head>
    <body>
      <h1>ようこそ、${username} さん！</h1>
      <p>ここはログインした人だけが見れるページです。</p>
      <form action="/logout" method="post">
        <button type="submit">ログアウト</button>
      </form>
    </body>
    </html>
  `);
});

// ★★★ ここに管理者専用ページを追加 ★★★
app.get('/admin-panel', requireAuth, requireAdmin, function(req, res) {
  res.send(`
    <h1>管理者パネル</h1>
    <p>ようこそ、${req.session.user.username} さん。</p>
    <p>ここは管理者だけが見れる特別なページです。</p>
    <a href="/home">ホームに戻る</a>
  `);
});

// 5. ログアウト処理 (POST /logout)
app.post('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      return res.redirect('/home');
    }
    res.redirect('/login');
  });
});


// --- サーバーの起動 ---
app.listen(PORT, function() {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});
