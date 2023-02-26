import express from 'express'
import http from 'http'
import session from 'express-session';
import sockerio from "socket.io";
import * as redis from 'redis';

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

// redis接続
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});
redisClient.on('error', (err) => {
    console.log('Redis Client Error', err)
});
redisClient.connect();

setTimeout(async () => {
    // ユーザー情報をクリア
    await redisClient.del("userList");
    // メッセージはそのまま
    const _messageList = await redisClient.lRange("messageList", 0, -1);
    console.log(`messageList: `, _messageList);
}, 1000);

//ユーザー情報
type UserInfo = {
    // socketID
    socket_id: string;
    //  ルームID
    room_id: string;
    // 名前
    name?: string;
    // 新規ルーム作成
    new?: boolean;
}

type SendMessage = {
    msg: string;
}

// コネクション確立
io.on("connection", (socket) => {
    console.log(socket.id);

    // Roomへ入る
    socket.on("join", (msg: UserInfo) => {
        console.log(`[${socket.id}] join client: `, msg);

        // ルーム作成時のみデータを初期化
        if (msg.new === true) {
            redisClient.del("userList");
            redisClient.del("messageList");
        }

        // ユーザー登録
        redisClient.lPush("userList", JSON.stringify({
            socket_id: socket.id,
            room_id: msg.room_id,
        }));

        // 入室
        socket.join(msg.room_id);
    });

    // イベント受信
    socket.on("message", async (msg: SendMessage) => {
        console.log(`[${socket.id}] send client: }`, msg);
        const _date = (new Date()).toString();

        // ユーザー一覧をすべて取得
        const _userList = await redisClient.lRange("userList", 0, -1);
        const filterUsers = _userList.filter((item) => {
            const _item: UserInfo = JSON.parse(item);
            return _item.socket_id === socket.id
        });
        if (filterUsers.length <= 0) {
            console.log(`unknown user: ${socket.id}`);
            return;
        }
        const _user: UserInfo = JSON.parse(filterUsers[0]);

        // データを保存する
        redisClient.lPush("messageList", JSON.stringify({
            msg: msg.msg,
            date: _date,
            room_id: _user.room_id
        }));

        // 受診したメッセージを返送
        io.to(_user.room_id).emit('receiveMessage', {
            msg: msg.msg,
            date: _date,
        });
    });

    // 切断
    socket.on("disconnect", async (reason) => {
        console.log(`user disconnected. reason is ${reason}.`);

        // ユーザー一覧をすべて取得
        const _userList = await redisClient.lRange("userList", 0, -1);

        // ユーザー一覧より対象のユーザーを除外する
        const filterUsers = _userList.filter((item) => {
            const _item: UserInfo = JSON.parse(item);
            return _item.socket_id !== socket.id
        });
        console.log(`userList2: `, filterUsers);

        // 削除して再作成
        await redisClient.del("userList");
        filterUsers.map((item) => {
            redisClient.lPush("userList", item);
        });

        // 退出する
        _userList.map((item) => {
            const _item: UserInfo = JSON.parse(item);
            if (_item.socket_id === socket.id) {
                socket.leave(_item.room_id);
            }
        });

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

// 既存メッセージを返却
app.get('/messages', async (req: express.Request, res: express.Response) => {

    console.log(`params: `, req.query);
    const _id = req.query.id;

    // メッセージ取得
    const _messageList = await redisClient.lRange("messageList", 0, -1);
    const _messages = _messageList.filter((item) => {
        const _item = JSON.parse(item);
        return _item.room_id === _id;
    }).map((item) => {
        return JSON.parse(item);
    })
    res.json(
        {
            messages: _messages
        }
    );
})

server.listen(3001, () => {
    console.log("Start on port 3001.")
})
