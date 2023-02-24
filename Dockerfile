#vimage
FROM node:18.14

# 環境変数
ENV TZ Asia/Tokyo
ENV LANG C.UTF-8

# yarnのパッケージ取得
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo 'deb http://dl.yarnpkg.com/debian/ stable main' > /etc/apt/sources.list.d/yarn.list

# 開発用パッケージインストール
RUN apt-get update -qq && \
    apt-get install -y vim build-essential yarn && \
    apt-get clean && \
    rm -rf /var/cache/apt

# 作業ディレクトリ
WORKDIR /backend

# 起動スクリプトコピー
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

# パラメータ未指定時の起動コマンド
CMD ["/bin/bash", "/docker-entrypoint.sh"]
