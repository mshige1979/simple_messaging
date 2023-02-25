import express from 'express'
import http from 'http'
import session from 'express-session';
import sockerio from "socket.io";

const app: express.Express = express();
const server = http.createServer(app);
const io = new sockerio.Server(server);

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
}));

//ユーザー情報
type UserInfo = {
    //  ルームID
    room_id: string;
    // 名前
    name?: string;
}

type SendMessage = {
    msg: string;
}

// ユーザー一覧
const userList: { [key: string]: UserInfo } = {}

// コネクション確立
io.on("connection", (socket) => {
    console.log(socket.id);

    // Roomへ入る
    socket.on("join", (msg: UserInfo) => {
        console.log(`[${socket.id}] join client: `, msg);

        // ユーザー登録
        userList[socket.id] = msg;

        // 入室
        socket.join(msg.room_id);
    });

    // イベント受信
    socket.on("message", (msg: SendMessage) => {
        console.log(`[${socket.id}] send client: }`, msg);

        // 受診したメッセージを返送
        io.to(userList[socket.id].room_id).emit('receiveMessage', msg.msg);
    });

    // 切断
    socket.on("disconnect", (reason) => {
        console.log(`user disconnected. reason is ${reason}.`);

        // 退出する
        if (userList[socket.id] !== undefined) {
            socket.leave(userList[socket.id].room_id);
            delete userList[socket.id];
        }

    });
});

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

server.listen(3001, () => {
    console.log("Start on port 3001.")
})
