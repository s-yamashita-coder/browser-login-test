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
// 本来はデータベースから取得します
const users = [
  { id: 1, username: 'user1', password: 'password1' },
  { id: 2, username: 'admin', password: 'admin_pass' }
];

// --- 認証チェック用のミドルウェア ---
// この関数をログインが必要なページの前に挟むことで、
// ログインしていないユーザーをログインページにリダイレクトします。
const requireAuth = (req, res, next) => {
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
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.redirect('/login');
  }
});

// 2. ログイン画面を表示 (GET /login)
app.get('/login', (req, res) => {
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
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 入力されたユーザー名とパスワードでユーザーを探す
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // ユーザーが見つかったら、セッションにユーザー情報を保存
    // (セキュリティのためパスワードは保存しない)
    req.session.user = {
      id: user.id,
      username: user.username
    };
    // ホーム画面へリダイレクト
    res.redirect('/home');
  } else {
    // 見つからなければ、エラーメッセージ付きでログイン画面へリダイレクト
    res.redirect('/login?failed=1');
  }
});

// 4. ホーム画面 (GET /home)
// `requireAuth` ミドルウェアを適用して、ログイン必須にする
app.get('/home', requireAuth, (req, res) => {
  // セッションからユーザー名を取り出す
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

// 5. ログアウト処理 (POST /logout)
app.post('/logout', (req, res) => {
  // セッションを破棄する
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/home');
    }
    // ログインページへリダイレクト
    res.redirect('/login');
  });
});


// --- サーバーの起動 ---
app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});
