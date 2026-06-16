# JavaEats_with_AWS
SpringBootで作成された"JavaEats"システムをAWSクラウドに移行する実験

### コンテナ（再）作成時に行うこと
```
// AWS認証設定
aws configure
//Git初期設定←認証も
git config --global user.email "you@example.com"
git config --global user.name "Your Name"
**AWS認証情報とClaudeのAPIキーをバックアップすること
cp -r /home/vscode/.aws ./
cp -r /home/vscode/.claude ./
```

### 備忘録
```
mkdir packages
cd packages/
mvn archetype:generate -DgroupId=jp.co.ambl.javaeats -DartifactId=api -Dversion=1.0-SNAPSHOT \
-DarchetypeGroupId=com.amazonaws.serverless.archetypes \
-DarchetypeArtifactId=aws-serverless-springboot4-archetype -DarchetypeVersion=3.0.0
cd api
sam build --use-container
sam local start-api
``` 