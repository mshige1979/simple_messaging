# simple_messaging

雑にいうと socketio を利用した chat

## ECR

### build

```
docker build -t simple-messaging-test -f Dockerfile.prod .
```

### 起動

```
docker run -it -p 3001:3001 simple-messaging-test
```
