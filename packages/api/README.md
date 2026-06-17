# API サーバーレス API
[`aws-serverless-java-container`](https://github.com/aws/serverless-java-container) で作成された API プロジェクト。

スターターのプロジェクトは、`GET` リクエストを受け付ける単純な `/ping` リソースとそのテストを定義しています。

プロジェクトフォルダには `template.yml` ファイルも含まれています。この [SAM](https://github.com/awslabs/serverless-application-model) ファイルを使用して、プロジェクトを AWS Lambda と Amazon API Gateway にデプロイするか、[SAM CLI](https://github.com/awslabs/aws-sam-cli) でローカルでテストできます。

## 前提条件
* [AWS CLI](https://aws.amazon.com/cli/)
* [SAM CLI](https://github.com/awslabs/aws-sam-cli)
* [Gradle](https://gradle.org/) または [Maven](https://maven.apache.org/)

## プロジェクトのビルド
SAM CLI を使用してプロジェクトをすばやくビルドできます
```bash
$ mvn archetype:generate -DartifactId=api -DarchetypeGroupId=com.amazonaws.serverless.archetypes -DarchetypeArtifactId=aws-serverless-jersey-archetype -DarchetypeVersion=3.0.0 -DgroupId=jp.co.ambl.javaeats -Dversion=1.0-SNAPSHOT -Dinteractive=false
$ cd api
$ sam build
Building resource 'ApiFunction'
Running JavaGradleWorkflow:GradleBuild
Running JavaGradleWorkflow:CopyArtifacts

Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml

次に使用できるコマンド
=========================
[*] 関数を呼び出す: sam local invoke
[*] デプロイ: sam deploy --guided
```

## SAM CLI でローカルテストする

プロジェクトルートフォルダ（`template.yml` ファイルがある場所）から、SAM CLI で API を起動します。

```bash
$ sam local start-api

...
Mounting com.amazonaws.serverless.archetypes.StreamLambdaHandler::handleRequest (java11) at http://127.0.0.1:3000/{proxy+} [OPTIONS GET HEAD POST PUT DELETE PATCH]
...
```

新しいシェルを使用して、API にテスト ping リクエストを送信できます:

```bash
$ curl -s http://127.0.0.1:3000/ping | python -m json.tool

{
    "pong": "Hello, World!"
}
``` 

## AWS へのデプロイ
AWS アカウントにアプリケーションをデプロイするには、SAM CLI のガイド付きデプロイプロセスを使用して画面の指示に従います

```
$ sam deploy --guided
```

デプロイが完了すると、SAM CLI はスタックの出力（新しいアプリケーション URL を含む）を出力します。`curl` またはウェブブラウザを使用して URL を呼び出すことができます

```
...
-------------------------------------------------------------------------------------------------------------
OutputKey-Description                        OutputValue
-------------------------------------------------------------------------------------------------------------
ApiApi - URL for application            https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/Prod/pets
-------------------------------------------------------------------------------------------------------------
```

`OutputValue` をブラウザにコピーするか、curl を使用して最初のリクエストをテストします:

```bash
$ curl -s https://xxxxxxx.execute-api.us-west-2.amazonaws.com/Prod/ping | python -m json.tool

{
    "pong": "Hello, World!"
}
```
