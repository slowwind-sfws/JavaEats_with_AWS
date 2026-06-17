import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';


export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda関数を作成
    const defaultLambda = new lambda.Function(this, 'defaultFunc', {
      runtime: lambda.Runtime.JAVA_21,
      handler: 'jp.co.ambl.javaeats.StreamLambdaHandler::handleRequest',
      code: lambda.Code.fromAsset('../api/target/api-1.0-SNAPSHOT-lambda-package.zip'),
    });

    // API Gatewayを作成
    //const api = new apigateway.RestApi(this, 'MyApi', {
    const api = new apigateway.LambdaRestApi(this, 'MyApi', {
      handler: defaultLambda
      /*deployOptions: {
        stageName: 'api',
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,//['Content-Type', 'Authorization','X-Api-Key'],
        statusCode: 200,
      },
      cloudWatchRole: true,*/
      //defaultIntegration: new apigateway.LambdaIntegration(defaultLambda),
    });

    //api.root.addMethod('GET', new apigateway.LambdaIntegration(defaultLambda));
  }
}
