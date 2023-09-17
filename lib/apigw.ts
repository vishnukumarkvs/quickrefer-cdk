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
  getChatMessagesLambda: IFunction;
  getUnseenCountOfChatLambda: IFunction;
  getAllUnseenCountLambda: IFunction;
  updateUnseenStatusLambda: IFunction;
}

export class ApiGateways extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    // Neo4j APIs
    const apiGateway = new RestApi(this, "Neo4jApiGw", {
      restApiName: "Neo4j APIs",
      deploy: false,
    });

    const postJobIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForPostJob
    );

    const searchByParameterIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForSearchByParameter
    );

    const referralSubmitIntegration = new LambdaIntegration(
      props.createNeo4jLambdaForReferralSubmit
    );

    const postJobResource = apiGateway.root.addResource("post-job");
    postJobResource.addMethod("POST", postJobIntegration);
    postJobResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    const searchByParameterResource = apiGateway.root.addResource(
      "search-by-parameter"
    );
    searchByParameterResource.addMethod("GET", searchByParameterIntegration);
    searchByParameterResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    const referralSubmitResource =
      apiGateway.root.addResource("referral-submit");
    // referralSubmitResource.addMethod("GET", referralSubmitIntegration);
    referralSubmitResource.addMethod("POST", referralSubmitIntegration);
    referralSubmitResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    // External Job Post API
    const extjobpostapi = new RestApi(this, "ExtJobPost", {
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

    // Resume Upload API
    const resumeUploadApi = new RestApi(this, "ResumeUpload", {
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

    // get chat messages from chatId
    const chatMessagesApi = new RestApi(this, "ChatMessages", {
      restApiName: "Chat Messages API",
      deploy: false,
    });

    const chatMessagesIntegration = new LambdaIntegration(
      props.getChatMessagesLambda
    );

    const getAllUnseenCountIntegration = new LambdaIntegration(
      props.getAllUnseenCountLambda
    );

    const getUnseenCountOfChatIntegration = new LambdaIntegration(
      props.getUnseenCountOfChatLambda
    );

    const updateUnseenStatusIntegration = new LambdaIntegration(
      props.updateUnseenStatusLambda
    );

    const chatMessagesResource = chatMessagesApi.root.addResource("messages");
    chatMessagesResource.addMethod("GET", chatMessagesIntegration);
    chatMessagesResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    });

    const chatStatusResource = chatMessagesApi.root.addResource("status");
    chatStatusResource
      .addResource("get-all-unseen")
      .addMethod("GET", getAllUnseenCountIntegration);

    chatStatusResource
      .addResource("get-unseen-count-of-chat")
      .addMethod("GET", getUnseenCountOfChatIntegration);

    // chatStatusResource
    //   .addResource("updateUnseenStatus")
    //   .addMethod("POST", updateUnseenStatusIntegration);

    // chatStatusResource.addCorsPreflight({
    //   allowOrigins: ["*"], // You might want to restrict this in production
    //   allowMethods: ["GET", "POST", "OPTIONS"],
    //   allowHeaders: ["Content-Type"],
    // });

    const updateUnseenStatusResource = chatStatusResource.addResource(
      "update-unseen-status"
    );
    updateUnseenStatusResource.addMethod("POST", updateUnseenStatusIntegration);

    // Configure CORS for the resource
    updateUnseenStatusResource.addCorsPreflight({
      allowOrigins: ["*"], // You might want to restrict this in production
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
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
      `ExtjobpostDeployment${Date.now()}`,
      {
        api: extjobpostapi,
      }
    );
    const extjobpoststage = new Stage(this, "ExtjobpostStage", {
      deployment: extjobpostdeployment,
      stageName: "dev",
    });
    extjobpostapi.deploymentStage = extjobpoststage;

    // Deploy Resume Upload Api
    const resumeUploadDeployment = new Deployment(
      this,
      `ResumeUploadDeployment${Date.now()}`,
      {
        api: resumeUploadApi,
      }
    );
    const resumeUploadStage = new Stage(this, "ResumeUploadStage", {
      deployment: resumeUploadDeployment,
      stageName: "dev",
    });
    resumeUploadApi.deploymentStage = resumeUploadStage;

    // Deploy Chat Messages Api
    const chatMessagesDeployment = new Deployment(
      this,
      `ChatMessagesDeployment${Date.now()}`,
      {
        api: chatMessagesApi,
      }
    );
    const chatMessagesStage = new Stage(this, "ChatMessagesStage", {
      deployment: chatMessagesDeployment,
      stageName: "dev",
    });
    chatMessagesApi.deploymentStage = chatMessagesStage;
  }
}
