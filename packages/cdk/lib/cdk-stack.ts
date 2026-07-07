import * as cdk from 'aws-cdk-lib/core';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });


export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 既存VPCをインポート
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: 'vpc-0aa26b319b8286781',
    });

    // Lambda用セキュリティグループ
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // AuroraのSGにLambdaからのMySQL接続を許可
    const auroraSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'AuroraSg', 'sg-0ae9bbe6a88477d97');
    auroraSg.addIngressRule(lambdaSg, ec2.Port.tcp(3306), 'Allow MySQL from Lambda');

    // CloudWatch Logs用VPC Endpoint
    new ec2.InterfaceVpcEndpoint(this, 'LogsEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'Subnet1', 'subnet-0a5539df09716c9f7'),
          ec2.Subnet.fromSubnetId(this, 'Subnet2', 'subnet-0a53ffdb75738bbb4'),
        ],
      },
    });

    // Cognito ユーザープールとクライアントの作成
    const userPool = new cognito.UserPool(this, 'JavaEatsUserPool', {
      userPoolName: 'javaeats-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発・検証デプロイ用。必要に応じて RETAIN に変更可能
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'JavaEatsUserPoolClient', {
      userPool,
      authFlows: { adminUserPassword: true, userSrp: true },
    });

    // S3バケットの作成
    const websiteBucket = new s3.Bucket(this, 'react-s3-host', {
      // スタック削除時にバケットも削除
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // バケット内のオブジェクトも自動削除
      autoDeleteObjects: true,
      // 直接アクセスをブロック
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteErrorDocument: 'index.html',
      websiteIndexDocument: 'index.html',
    });

    const dbUrl = process.env.DB_URL;
    const dbUsername = process.env.DB_USERNAME;
    const dbPassword = process.env.DB_PASSWORD;

    if (!dbUrl || !dbUsername || !dbPassword) {
      throw new Error('DB_URL / DB_USERNAME / DB_PASSWORD が未設定です。packages/cdk/.env を確認してください。');
    }

    const dbEnv = {
      SPRING_DATASOURCE_URL: dbUrl,
      SPRING_DATASOURCE_USERNAME: dbUsername,
      SPRING_DATASOURCE_PASSWORD: dbPassword,
    };

    const lambdaCommonProps = {
      runtime: lambda.Runtime.JAVA_21,
      handler: 'org.springframework.cloud.function.adapter.aws.FunctionInvoker',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      // snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS, // 初期化失敗の切り分けのため一時無効化
      vpc,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'LambdaSubnet1', 'subnet-0a5539df09716c9f7'),
          ec2.Subnet.fromSubnetId(this, 'LambdaSubnet2', 'subnet-0a53ffdb75738bbb4'),
        ],
      },
      securityGroups: [lambdaSg],
    };

    // ヘルパー関数の定義
    const createSpringLambda = (
      definition: string,
      jarPath: string
    ) => {
      const funcId = `${definition}Func`;
      
      const fn = new lambda.Function(this, funcId, {
        ...lambdaCommonProps,
        code: lambda.Code.fromAsset(jarPath),
        environment: {
          SPRING_CLOUD_FUNCTION_DEFINITION: definition,
          ...dbEnv,
        },
      });

      const aliasPascalId = definition.charAt(0).toUpperCase() + definition.slice(1);
      new lambda.Alias(this, `${aliasPascalId}LiveAlias`, {
        aliasName: 'live',
        version: fn.currentVersion,
      });

      return fn;
    };

    const itemJarPath = '../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar';
    const orderJarPath = '../api/order-service/target/order-service-0.0.1-SNAPSHOT.jar';
    const userJarPath = '../api/user-service/target/user-service-0.0.1-SNAPSHOT.jar';

    // Lambda関数を作成
    const itemListFunction = createSpringLambda('listItems', itemJarPath);
    const itemGetFunction = createSpringLambda('getItem', itemJarPath);
    const itemCategoryFunction = createSpringLambda('listCategories', itemJarPath);
    const createOrderFunction = createSpringLambda('createOrder', orderJarPath);
    const orderListFunction = createSpringLambda('listOrders', orderJarPath);
    const orderGetFunction = createSpringLambda('getOrder', orderJarPath);

    const userRegisterFunction = createSpringLambda('registerUser', userJarPath);
    const userGetFunction = createSpringLambda('getUser', userJarPath);
    const userUpdateFunction = createSpringLambda('updateUser', userJarPath);

    // API Gatewayを作成
    const api = new apigateway.RestApi(this, 'MyApi', {
      deployOptions: {
        stageName: 'api',
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        statusCode: 200,
      },
      cloudWatchRole: true,
    });

    // Cognito オーソライザーの追加
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'JavaEatsAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // パスからネストされたリソースを自動生成・取得するヘルパー
    const getOrCreateResource = (root: apigateway.IResource, path: string): apigateway.IResource => {
      return path.split('/').reduce((parent, segment) => {
        if (!segment) return parent;
        return parent.getResource(segment) ?? parent.addResource(segment);
      }, root);
    };

    // ルート定義の宣言
    const routes = [
      { path: 'item/list', method: 'GET', fn: itemListFunction },
      { path: 'item/category', method: 'GET', fn: itemCategoryFunction },
      { path: 'item/{id}', method: 'GET', fn: itemGetFunction },
      { path: 'order', method: 'POST', fn: createOrderFunction },
      { path: 'order/list', method: 'GET', fn: orderListFunction },
      { path: 'order/{id}', method: 'GET', fn: orderGetFunction },
      { path: 'user/register', method: 'POST', fn: userRegisterFunction },
      { path: 'user/{id}', method: 'GET', fn: userGetFunction },
      { path: 'user/{id}', method: 'PUT', fn: userUpdateFunction },
    ];

    // ループで一括登録とCognito認証適用
    routes.forEach(({ path, method, fn }) => {
      const resource = getOrCreateResource(api.root, path);
      resource.addMethod(method, new apigateway.LambdaIntegration(fn), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    });

    // SPA ルーティング用 CloudFront Function
    // .を含まない（=静的ファイルでない）かつ /api で始まらないパスは /index.html に書き換える
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (!uri.startsWith('/api') && !uri.includes('.')) {
    request.uri = '/index.html';
  }
  return request;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        functionAssociations: [{
          function: spaRoutingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.RestApiOrigin(api, {
            originPath: '',
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        }
      },
      defaultRootObject: 'index.html',
    });

    // S3バケットにReactアプリをデプロイ（デプロイ時に動的ビルドを実行）
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        // 静的アセットのビルド（ビルド自体は環境変数に依存させず、常に共通の成果物を出力する）
        s3deploy.Source.asset(path.join(__dirname, '..', '..', 'web'), {
          bundling: {
            image: cdk.DockerImage.fromRegistry('node:20-alpine'),
            command: [
              'sh',
              '-c',
              'npm ci && npm run build && cp -r build/* /asset-output/',
            ],
            user: 'root',
          },
        }),
        // CDKデプロイ時に実際の値が確定する本番用環境設定ファイルを動的生成してS3に直接デプロイ
        s3deploy.Source.data(
          'env-config.js',
          `window._env_ = {
            REACT_APP_COGNITO_USER_POOL_ID: "${userPool.userPoolId}",
            REACT_APP_COGNITO_CLIENT_ID: "${userPoolClient.userPoolClientId}",
            REACT_APP_API_BASE: "/api"
          };`
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });

    new cdk.CfnOutput(this, 'Hosting URL', {
      value: 'https://' + distribution.distributionDomainName
    });
  }
}
