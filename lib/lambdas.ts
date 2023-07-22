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

dotenv.config();

interface MyLambdaProps {
  utilsTable: ITable;
}

export class MyLambdas extends Construct {
  public readonly neo4jLambdaForPostjob: NodejsFunction;
  public readonly neo4jLambdaForSearchByParameter: NodejsFunction;
  public readonly neo4jLambdaForReferralSubmit: NodejsFunction;
  public readonly neo4jLambdaForUpdateCompanies: NodejsFunction;
  public readonly webpageTextExtractor: NodejsFunction;
  public readonly openaiJobExtractor: PythonFunction;
  public readonly postOnlineJob: NodejsFunction;

  constructor(scope: Construct, id: string, props: MyLambdaProps) {
    super(scope, id);

    this.neo4jLambdaForPostjob = this.createNeo4jLambdaForPostJob();
    this.neo4jLambdaForSearchByParameter =
      this.createNeo4jLambdaForSearchByParameter();
    // No API Gateway for this lambda
    this.neo4jLambdaForUpdateCompanies =
      this.createNeo4jLambdaForUpdateCompanies(props.utilsTable);
    this.neo4jLambdaForReferralSubmit =
      this.createNeo4jLambdaForReferralSubmit();
    this.webpageTextExtractor = this.createWebpageTextExtractorLambda();
    this.openaiJobExtractor = this.createOpenaiJobExtractorLambda();
    this.postOnlineJob = this.createPostOnlineJobLambda();
  }

  private createNeo4jLambdaForPostJob(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(this, "neo4jLambdaForPostjob", {
      entry: join(__dirname, "..", "src", "neo4j", "postjob", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(neo4jLambda).add("Project", "JT");
    Tags.of(neo4jLambda).add("Function", "Post Job HR or Referrer");

    return neo4jLambda;
  }

  private createNeo4jLambdaForSearchByParameter(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
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
    Tags.of(neo4jLambda).add("Project", "JT");
    Tags.of(neo4jLambda).add("Function", "Search Job By Parameters");
    return neo4jLambda;
  }

  private createNeo4jLambdaForReferralSubmit(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
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

    Tags.of(neo4jLambda).add("Project", "JT");
    Tags.of(neo4jLambda).add("Function", "Referral Submit");
    return neo4jLambda;
  }

  // No API Gateway for this lambda
  private createNeo4jLambdaForUpdateCompanies(
    utilsTable: ITable
  ): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
      },
      runtime: Runtime.NODEJS_18_X,
    };

    const neo4jLambda = new NodejsFunction(
      this,
      "neo4jLambdaForUpdateCompanies",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "neo4j",
          "updateCompanies",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );

    utilsTable.grantWriteData(neo4jLambda);

    Tags.of(neo4jLambda).add("Project", "JT");
    Tags.of(neo4jLambda).add("Function", "UpdateCompanies from neo4j to ddb");

    return neo4jLambda;
  }

  private createWebpageTextExtractorLambda(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk", "@sparticuz/chromium", "puppeteer-core"],
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(120),
      memorySize: 2048,
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          "puppeteerLayer",
          "arn:aws:lambda:us-east-1:895656015678:layer:puppeteer3:1"
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

    Tags.of(webExtractLambda).add("Project", "JT");
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
    Tags.of(fn).add("Project", "JT");
    Tags.of(fn).add("Function", "OpenAI Job Extractor");
    return fn;
  }

  private createPostOnlineJobLambda(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
      },
    };

    const postOnlineJobLambda = new NodejsFunction(this, "postOnlineJob", {
      entry: join(__dirname, "..", "src", "neo4j", "postOnlineJob", "index.js"),
      ...nodeJsFunctionProps,
    });

    Tags.of(postOnlineJobLambda).add("Project", "JT");
    Tags.of(postOnlineJobLambda).add("Function", "PostOnlineJob");

    return postOnlineJobLambda;
  }
}
