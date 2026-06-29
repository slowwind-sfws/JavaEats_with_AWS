import * as cdk from 'aws-cdk-lib/core';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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
      SPRING_SQL_INIT_MODE: 'always',
    };

    const lambdaCommonProps = {
      runtime: lambda.Runtime.JAVA_21,
      handler: 'org.springframework.cloud.function.adapter.aws.FunctionInvoker',
      code: lambda.Code.fromAsset('../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar'),
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

    // Lambda関数を作成
    const itemListFunction = new lambda.Function(this, 'defaultFunc', {
      ...lambdaCommonProps,
      environment: {
        SPRING_CLOUD_FUNCTION_DEFINITION: 'listItems',
        ...dbEnv,
      },
    });

    new lambda.Alias(this, 'ItemListLiveAlias', {
      aliasName: 'live',
      version: itemListFunction.currentVersion,
    });

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

    const item = api.root.addResource('item');
    const list = item.addResource('list');
    list.addMethod('GET', new apigateway.LambdaIntegration(itemListFunction));

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        // HTTPSへのリダイレクト
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // キャッシュ設定
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED //CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.RestApiOrigin(api, {
            originPath: '',
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        }
      },
      // デフォルトルート
      defaultRootObject: 'index.html'
    });

    // S3バケットにReactアプリをデプロイ
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../web/build')],
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
