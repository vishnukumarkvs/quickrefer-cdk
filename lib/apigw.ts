import {
  AwsIntegration,
  ContentHandling,
  Deployment,
  LambdaIntegration,
  RestApi,
  Stage,
} from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface ApiGatewayProps {
  createNeo4jLambdaForPostJob: IFunction;
  createNeo4jLambdaForSearchByParameter: IFunction;
  createNeo4jLambdaForReferralSubmit: IFunction;
  extjobApiIamRole: IRole;
  resumesBucket: IBucket;
  resumesUploadLambda: IFunction;
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

    const referralSubmitIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForReferralSubmit
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

    // Create resource for Referral Submit
    const referralSubmitResource =
      apiGateway.root.addResource("referralSubmit");
    referralSubmitResource.addMethod("GET", referralSubmitIntegration);
    referralSubmitResource.addMethod("POST", referralSubmitIntegration);
    referralSubmitResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    const extjobpostapi = new RestApi(this, "extjobpost", {
      restApiName: "External JobPost API",
      deploy: false,
    });

    extjobpostapi.root.addMethod(
      "POST",
      new AwsIntegration({
        service: "states",
        action: "StartExecution",
        integrationHttpMethod: "POST",
        options: {
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": `{"done": true}`,
              },
            },
          ],
          credentialsRole: props.extjobApiIamRole,
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );

    const resumeUploadApi = new RestApi(this, "resumeUpload", {
      restApiName: "Resume Upload API",
      deploy: false,
    });

    const resumeUploadIntegration = new LambdaIntegration(
      props.resumesUploadLambda
    );

    props.resumesBucket.grantPut(props.resumesUploadLambda);

    const resumeUploadResource = resumeUploadApi.root.addResource("upload");
    resumeUploadResource.addMethod("PUT", resumeUploadIntegration);
    resumeUploadResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["PUT", "OPTIONS"],
      allowHeaders: ["Content-Type", "file-extension"],
    });

    // Deploy API Gateway
    // Always changes, will appear in cdk diff
    // This needs to be done after all the resources are created, or else cdk wont catch it and dev stage wont be updated with new lambda integration
    const deployment = new Deployment(this, `Neo4jApiDeployment${Date.now()}`, {
      api: apiGateway,
    });
    const stage = new Stage(this, "Neo4jApiStage", {
      deployment: deployment,
      stageName: "dev",
    });
    apiGateway.deploymentStage = stage;

    // Deploy External JobPost Api
    const extjobpostdeployment = new Deployment(
      this,
      `extjobpostDeployment${Date.now()}`,
      {
        api: extjobpostapi,
      }
    );
    const extjobpoststage = new Stage(this, "extjobpostStage", {
      deployment: extjobpostdeployment,
      stageName: "dev",
    });
    extjobpostapi.deploymentStage = extjobpoststage;

    // Deploy Resume Upload Api
    const resumeUploadDeployment = new Deployment(
      this,
      `resumeUploadDeployment${Date.now()}`,
      {
        api: resumeUploadApi,
      }
    );
    const resumeUploadStage = new Stage(this, "resumeUploadStage", {
      deployment: resumeUploadDeployment,
      stageName: "dev",
    });
    resumeUploadApi.deploymentStage = resumeUploadStage;
  }
}
