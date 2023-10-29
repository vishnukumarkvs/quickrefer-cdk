import { LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import * as dotenv from "dotenv";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Duration, Tags } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import * as iam from "aws-cdk-lib/aws-iam";
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";

dotenv.config();

interface MyLambdaProps {
  qrActiveConnectionsTable: ITable;
  qrChatMessages: ITable;
  qrChatSummary: ITable;
}

export class MyLambdas extends Construct {
  public readonly neo4jLambdaForPostjob: NodejsFunction;
  public readonly neo4jLambdaForSearchByParameter: NodejsFunction;
  public readonly neo4jLambdaForReferralSubmit: NodejsFunction;
  public readonly neo4jLambdaForUpdateCompanies: NodejsFunction;
  public readonly webpageTextExtractor: NodejsFunction;
  public readonly openaiJobExtractor: PythonFunction;
  public readonly postOnlineJob: NodejsFunction;
  public readonly uploadFileToS3: NodejsFunction;

  // chat socket lambdas
  public readonly chatConnect: NodejsFunction;
  public readonly chatDisconnect: NodejsFunction;
  public readonly chatMessage: NodejsFunction;

  // chat status lambdas
  public readonly getChatMessages: NodejsFunction;
  public readonly getAllUnseenCount: NodejsFunction;
  public readonly getUnseenCountOfChat: NodejsFunction;
  public readonly updateUnseenStatus: NodejsFunction;

  // utils
  public readonly emailNotif: GoFunction;

  constructor(scope: Construct, id: string, props: MyLambdaProps) {
    super(scope, id);

    // const env = this.node.tryGetContext("env");
    // console.log(this.node.tryGetContext(env).NEO4J_URI);

    this.neo4jLambdaForPostjob = this.createNeo4jLambdaForPostJob();
    this.neo4jLambdaForSearchByParameter =
      this.createNeo4jLambdaForSearchByParameter();

    this.neo4jLambdaForReferralSubmit =
      this.createNeo4jLambdaForReferralSubmit();
    this.webpageTextExtractor = this.createWebpageTextExtractorLambda();
    this.openaiJobExtractor = this.createOpenaiJobExtractorLambda();
    this.postOnlineJob = this.createPostOnlineJobLambda();
    this.uploadFileToS3 = this.createUploadResumeLambda();

    this.emailNotif = this.createEmailNotifLambda(props.qrChatSummary);

    // websocket api gateway policy
    const webSocketApiGatewayPolicy = new iam.PolicyStatement({
      actions: ["execute-api:ManageConnections"],
      resources: ["*"],
      effect: Effect.ALLOW,
    });

    // Chat lambdas
    this.chatConnect = this.createChatConnectLambda(
      props.qrActiveConnectionsTable,
      webSocketApiGatewayPolicy
    );
    this.chatDisconnect = this.createChatDisconnectLambda(
      props.qrActiveConnectionsTable,
      webSocketApiGatewayPolicy
    );
    this.chatMessage = this.createChatMessageLambda(
      props.qrActiveConnectionsTable,
      props.qrChatMessages,
      props.qrChatSummary,
      webSocketApiGatewayPolicy
    );

    // Chat status lambdas
    this.getChatMessages = this.getChatMessagesLambda(props.qrChatMessages);
    this.getAllUnseenCount = this.getAllUnseenCountLambda(props.qrChatSummary);
    this.getUnseenCountOfChat = this.getUnseenCountOfChatLambda(
      props.qrChatSummary
    );
    this.updateUnseenStatus = this.createUpdateUnseenStatusLambda(
      props.qrChatSummary
    );
  }

  // Seperate functions
  private createNeo4jLambdaForPostJob(): NodejsFunction {
    const env = this.node.tryGetContext("env");
    // console.log(this.node.tryGetContext(env).NEO4J_URI);
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
        minify: true,
      },
      environment: {
        URI: this.node.tryGetContext(env).NEO4J_URI,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: this.node.tryGetContext(env).NEO4J_PASSWORD,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(this, "neo4jLambdaForPostjob", {
      entry: join(__dirname, "..", "src", "neo4j", "postjob", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(neo4jLambda).add("Project", "QR");
    Tags.of(neo4jLambda).add("Function", "Post Job HR or Referrer");

    return neo4jLambda;
  }

  private createNeo4jLambdaForSearchByParameter(): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        URI: this.node.tryGetContext(env).NEO4J_URI,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: this.node.tryGetContext(env).NEO4J_PASSWORD,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(
      this,
      "neo4jLambdaForSearchByParameter",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "neo4j",
          "searchByParameter",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );
    Tags.of(neo4jLambda).add("Project", "QR");
    Tags.of(neo4jLambda).add("Function", "Search Job By Parameters");
    return neo4jLambda;
  }

  private createNeo4jLambdaForReferralSubmit(): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        URI: this.node.tryGetContext(env).NEO4J_URI,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: this.node.tryGetContext(env).NEO4J_PASSWORD,
        REGION: this.node.tryGetContext(env).REGION,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(
      this,
      "neo4jLambdaForReferralSubmit",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "neo4j",
          "referralSubmit",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );
    neo4jLambda.addToRolePolicy(
      new PolicyStatement({
        resources: ["arn:aws:sns:us-east-1:895656015678:Referrals"],
        actions: ["sns:Publish"],
        effect: Effect.ALLOW,
      })
    );

    Tags.of(neo4jLambda).add("Project", "QR");
    Tags.of(neo4jLambda).add("Function", "Referral Submit");
    return neo4jLambda;
  }

  private createWebpageTextExtractorLambda(): NodejsFunction {
    const env = this.node.tryGetContext("env");
    const region = this.node.tryGetContext(env).REGION;
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          "@aws-sdk/*",
          "@sparticuz/chromium",
          "puppeteer-core",
        ],
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(120),
      memorySize: 2048,
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          "puppeteerLayer",
          `arn:aws:lambda:${region}:895656015678:layer:puppeteer3:1`
        ),
      ],
    };

    const webExtractLambda = new NodejsFunction(this, "webpageTextExtractor", {
      entry: join(
        __dirname,
        "..",
        "src",
        "utils",
        "webpageTextExtracter",
        "index.js"
      ),
      ...nodeJsFunctionProps,
    });

    Tags.of(webExtractLambda).add("Project", "QR");
    Tags.of(webExtractLambda).add("Function", "Puppeteer Text Extractor");

    return webExtractLambda;
  }
  private createOpenaiJobExtractorLambda(): PythonFunction {
    const fn = new PythonFunction(this, "openaiJobExtractorLambda", {
      entry: join(__dirname, "..", "src", "utils", "openaiJobExtractor"),
      runtime: Runtime.PYTHON_3_9,
      timeout: Duration.seconds(120),
      bundling: {
        assetExcludes: [".venv"],
      },
      environment: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY as string,
      },
      index: "lambda_handler.py",
      handler: "lambda_handler",
    });
    Tags.of(fn).add("Project", "QR");
    Tags.of(fn).add("Function", "OpenAI Job Extractor");
    return fn;
  }

  private createPostOnlineJobLambda(): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      environment: {
        URI: this.node.tryGetContext(env).NEO4J_URI,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: this.node.tryGetContext(env).NEO4J_PASSWORD,
      },
    };

    const postOnlineJobLambda = new NodejsFunction(this, "postOnlineJob", {
      entry: join(__dirname, "..", "src", "neo4j", "postOnlineJob", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(postOnlineJobLambda).add("Project", "QR");
    Tags.of(postOnlineJobLambda).add("Function", "PostOnlineJob");

    return postOnlineJobLambda;
  }

  private createUploadResumeLambda(): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        BUCKET_NAME: process.env.BUCKET_NAME as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
    };

    const uploadResumeLambda = new NodejsFunction(this, "uploadResume", {
      entry: join(__dirname, "..", "src", "aws", "fileUpload", "index.js"),
      ...nodeJsFunctionProps,
    });

    // Add permissions to the Lambda function to allow it to create CloudFront invalidations.
    const cloudFrontInvalidationStatement = new iam.PolicyStatement({
      actions: ["cloudfront:CreateInvalidation"],
      resources: ["*"], // Adjust as necessary.
      effect: iam.Effect.ALLOW,
    });

    uploadResumeLambda.addToRolePolicy(cloudFrontInvalidationStatement);

    Tags.of(uploadResumeLambda).add("Project", "QR");
    Tags.of(uploadResumeLambda).add("Function", "UploadResume");

    return uploadResumeLambda;
  }

  // Chat lambdas
  private createChatConnectLambda(
    qrActiveConnectionsTable: ITable,
    webSocketApiGatewayPolicy: iam.PolicyStatement
  ): NodejsFunction {
    const env = this.node.tryGetContext("env");
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        ACTIVE_CONNECTIONS: process.env.DDB_ACTIVE_CONNECTIONS_TABLE as string,
        CHAT_MESSAGES: process.env.DDB_CHAT_MESSAGES_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      timeout: Duration.seconds(10),
    };

    const chatConnectLambda = new NodejsFunction(this, "chatConnect", {
      entry: join(__dirname, "..", "src", "chat", "connect", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(chatConnectLambda).add("Project", "QR");
    Tags.of(chatConnectLambda).add("Function", "chatConnect");

    qrActiveConnectionsTable.grantReadWriteData(chatConnectLambda);
    chatConnectLambda.addToRolePolicy(webSocketApiGatewayPolicy);

    return chatConnectLambda;
  }

  private createChatDisconnectLambda(
    qrActiveConnectionsTable: ITable,
    webSocketApiGatewayPolicy: iam.PolicyStatement
  ): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        ACTIVE_CONNECTIONS: process.env.DDB_ACTIVE_CONNECTIONS_TABLE as string,
        CHAT_MESSAGES: process.env.DDB_CHAT_MESSAGES_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
    };

    const chatDisconnectLambda = new NodejsFunction(this, "chatDisconnect", {
      entry: join(__dirname, "..", "src", "chat", "disconnect", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(chatDisconnectLambda).add("Project", "QR");
    Tags.of(chatDisconnectLambda).add("Function", "chatDisconnect");

    qrActiveConnectionsTable.grantReadWriteData(chatDisconnectLambda);
    chatDisconnectLambda.addToRolePolicy(webSocketApiGatewayPolicy);

    return chatDisconnectLambda;
  }

  private createChatMessageLambda(
    qrActiveConnectionsTable: ITable,
    qrChatMessages: ITable,
    qrChatSummary: ITable,
    webSocketApiGatewayPolicy: iam.PolicyStatement
  ): NodejsFunction {
    const env = this.node.tryGetContext("env");
    const WS_API_ID = this.node.tryGetContext(env).WS_API_ID;
    const region = this.node.tryGetContext(env).REGION;
    var wsendpoint = `https://${WS_API_ID}.execute-api.${region}.amazonaws.com/dev`;

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        ACTIVE_CONNECTIONS: process.env.DDB_ACTIVE_CONNECTIONS_TABLE as string,
        CHAT_MESSAGES: process.env.DDB_CHAT_MESSAGES_TABLE as string,
        CHAT_SUMMARY: process.env.DDB_CHAT_SUMMARY_TABLE as string,
        CHAT_WEBSPOCKET_APIGATEWAY_ENDPOINT: wsendpoint,
        REGION: region,
      },
      timeout: Duration.seconds(10),
    };

    const chatMessageLambda = new NodejsFunction(this, "chatMessage", {
      entry: join(__dirname, "..", "src", "chat", "sendmessage", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(chatMessageLambda).add("Project", "QR");
    Tags.of(chatMessageLambda).add("Function", "chatMessage");

    qrActiveConnectionsTable.grantReadWriteData(chatMessageLambda);
    qrChatMessages.grantReadWriteData(chatMessageLambda);
    qrChatSummary.grantReadWriteData(chatMessageLambda);
    chatMessageLambda.addToRolePolicy(webSocketApiGatewayPolicy);

    return chatMessageLambda;
  }

  private getChatMessagesLambda(qrChatMessages: ITable): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        ACTIVE_CONNECTIONS: process.env.DDB_ACTIVE_CONNECTIONS_TABLE as string,
        CHAT_MESSAGES: process.env.DDB_CHAT_MESSAGES_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      timeout: Duration.seconds(10),
    };

    const getChatMessagesLambda = new NodejsFunction(this, "getChatMessage", {
      entry: join(
        __dirname,
        "..",
        "src",
        "chat",
        "getchatmessages",
        "index.js"
      ),
      ...nodeJsFunctionProps,
    });

    Tags.of(getChatMessagesLambda).add("Project", "QR");
    Tags.of(getChatMessagesLambda).add("Function", "getChatMessages");

    qrChatMessages.grantReadWriteData(getChatMessagesLambda);

    return getChatMessagesLambda;
  }

  private getAllUnseenCountLambda(qrChatSummary: ITable): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        CHAT_SUMMARY: process.env.DDB_CHAT_SUMMARY_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      timeout: Duration.seconds(10),
    };

    const getAllUnseenCountLambda = new NodejsFunction(
      this,
      "getAllUnseenCount",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "chat",
          "getallunseencount",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );

    Tags.of(getAllUnseenCountLambda).add("Project", "QR");
    Tags.of(getAllUnseenCountLambda).add("Function", "getAllUnseenCount");

    qrChatSummary.grantReadData(getAllUnseenCountLambda);

    return getAllUnseenCountLambda;
  }

  private getUnseenCountOfChatLambda(qrChatSummary: ITable): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        CHAT_SUMMARY: process.env.DDB_CHAT_SUMMARY_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      timeout: Duration.seconds(10),
    };

    const getUnseenCountOfChatLambda = new NodejsFunction(
      this,
      "getUnseenCountOfChat",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "chat",
          "getunseencountofchat",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );

    Tags.of(getUnseenCountOfChatLambda).add("Project", "QR");
    Tags.of(getUnseenCountOfChatLambda).add("Function", "getUnseenCountOfChat");

    qrChatSummary.grantReadData(getUnseenCountOfChatLambda);

    return getUnseenCountOfChatLambda;
  }

  private createUpdateUnseenStatusLambda(
    qrChatSummary: ITable
  ): NodejsFunction {
    const env = this.node.tryGetContext("env");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        CHAT_SUMMARY: process.env.DDB_CHAT_SUMMARY_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
      },
      timeout: Duration.seconds(10),
    };

    const updateUnseenStatusLambda = new NodejsFunction(
      this,
      "updateUnseenStatus",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "chat",
          "updateunseenstatus",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );

    Tags.of(updateUnseenStatusLambda).add("Project", "QR");
    Tags.of(updateUnseenStatusLambda).add("Function", "updateUnseenStatus");

    qrChatSummary.grantReadWriteData(updateUnseenStatusLambda);

    return updateUnseenStatusLambda;
  }
  private createEmailNotifLambda(qrChatSummary: ITable): GoFunction {
    const env = this.node.tryGetContext("env");

    const aa = new GoFunction(this, "emailNotifLambda", {
      entry: join(__dirname, "..", "src", "utils", "emailnotif"),
      bundling: {
        forcedDockerBundling: true,
      },
      environment: {
        URI: this.node.tryGetContext(env).NEO4J_URI,
        USER: process.env.NEO4J_USERNAME as string,
        PASSWORD: this.node.tryGetContext(env).NEO4J_PASSWORD,
        DDB_TABLE_NAME: process.env.DDB_CHAT_SUMMARY_TABLE as string,
        REGION: this.node.tryGetContext(env).REGION,
        SMTP_HOST: this.node.tryGetContext(env).SMTP_HOST,
        SMTP_USER: this.node.tryGetContext(env).SMTP_USER,
        SMTP_PASS: this.node.tryGetContext(env).SMTP_PASS,
      },
      timeout: Duration.minutes(3),
    });
    qrChatSummary.grantReadData(aa);

    Tags.of(aa).add("Project", "QR");
    Tags.of(aa).add("Function", "EmailNotifications");
    return aa;
  }
}
