import {
  Deployment,
  LambdaIntegration,
  RestApi,
  Stage,
} from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface ApiGatewayProps {
  createNeo4jLambdaForPostJob: IFunction;
  createNeo4jLambdaForTesting: IFunction;
  createNeo4jLambdaForSearchByParameter: IFunction;
}

export class ApiGateways extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    // Create the API Gateway
    const apiGateway = new RestApi(this, "Neo4jApiGw", {
      restApiName: "Neo4j API",
      deploy: false,
    });

    // Create Lambda Integration for Post Job Lambda
    const postJobIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForPostJob
    );

    const searchByParameterIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForSearchByParameter
    );

    // Create Lambda Integration for Testing Lambda
    const testingIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForTesting
    );

    // Create resource for Post Job Lambda
    const postJobResource = apiGateway.root.addResource("postjob");
    postJobResource.addMethod("POST", postJobIntegration);
    postJobResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    // Create resource for Search By Parameter Lambda
    const searchByParameterResource =
      apiGateway.root.addResource("searchByParameter");
    searchByParameterResource.addMethod("GET", searchByParameterIntegration);
    searchByParameterResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    // Create resource for Testing Lambda
    const testingResource = apiGateway.root.addResource("testing");
    testingResource.addMethod("GET", testingIntegration);
    testingResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    // Deploy API Gateway
    // Always changes, will appear in cdk diff
    // This needs to be done after all the resources are created, or else cdk wont catch it and dev stage wont be updated with new lambda integration
    const deployment = new Deployment(this, `Neo4jApiDeployment${Date.now()}`, {
      api: apiGateway,
    });

    // Create a Stage
    const stage = new Stage(this, "Neo4jApiStage", {
      deployment: deployment,
      stageName: "dev",
    });

    // Associate the stage with the API Gateway
    apiGateway.deploymentStage = stage;
  }
}
