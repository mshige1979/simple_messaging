import express from 'express'
import session from 'express-session';

const app: express.Express = express()

// 環境変数出力
console.log(`env: `, process.env);

// jsonやformのデータを取れるようにする
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静的ファイルを読み込み可能とする
app.use(express.static('public'));

//CROS対応（というか完全無防備：本番環境ではだめ絶対）
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*")
    res.header("Access-Control-Allow-Headers", "*");
    next();
})

// セッション用設定
app.use(session({
    // セッションクッキー名
    name: "EXPRESS_SESSION",
    // 任意のキーを設定
    secret: 'secretsecretsecret',
    //　クッキーの設定
    cookie: {
        // 有効期限、未指定時はブラウザ終了時に消える
        //maxAge: 0,
        // ドメインが一致する場合のみ
        httpOnly: true,
        // path
        path: "/"
    },
    // セッションに変更がない場合に保存されない
    resave: false,
    // 初期値を設定しない
    saveUninitialized: true,
}))

app.listen(3000, () => {
    console.log("Start on port 3000.")
})

// セッション用のデータ型
declare module 'express-session' {
    interface SessionData {
        views: number
    }
}

// 画面
app.get('/', (req: express.Request, res: express.Response) => {
    console.log(`session:`, req.session)
    res.send("Hello, world")
})
