import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface WebsocketApiGatewayProps {
  connectHandler: IFunction;
  disconnectHandler: IFunction;
  sendMessageHandler: IFunction;
}

export class WebsocketApiGateways extends Construct {
  constructor(scope: Construct, id: string, props: WebsocketApiGatewayProps) {
    super(scope, id);

    const webSocketApi = new apigwv2.WebSocketApi(this, "MyWsApi", {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "ConnectIntegration",
          props.connectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "DisconnectIntegration",
          props.disconnectHandler
        ),
      },
    });

    webSocketApi.addRoute("sendmessage", {
      integration: new WebSocketLambdaIntegration(
        "SendMessageIntegration",
        props.sendMessageHandler
      ),
    });

    new apigwv2.WebSocketStage(this, "MyWsStage", {
      webSocketApi,
      stageName: "dev",
      autoDeploy: true,
    });

    const postToConnectionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:ManageConnections"],
      resources: [`arn:aws:execute-api:*:*:${webSocketApi.apiId}/*/*/*`], // Modify as per your resource ARN format
    });

    props.sendMessageHandler.addToRolePolicy(postToConnectionPolicy);
  }
}
