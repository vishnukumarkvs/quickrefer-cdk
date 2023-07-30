import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MyDatabases } from "./databases";
import { MyLambdas } from "./lambdas";
import { ApiGateways } from "./apigw";
import { IamStack } from "./iam";
import * as dotenv from "dotenv";
import { MyBuckets } from "./s3buckets";
import { MyCloudfront } from "./cloudfront";
import { MyCloudfrontS3 } from "./cloudfront_s3";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

dotenv.config();
export class JobdashboardBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new MyDatabases(this, "Database");
    const myLambdas = new MyLambdas(this, "MyLambdas", database);
    const myBuckets = new MyBuckets(this, "MyBuckets");

    const myCloudfrontS3 = new MyCloudfrontS3(this, "MyCloudfrontS3", {
      resumesBucket: myBuckets.resumesBucket,
    });

    const iamroles = new IamStack(this, "IamStack", {
      stateMachineArn: process.env.POST_ONLINE_JOB_STATE_MACHINE_ARN as string,
    });

    // const mydistributions = new MyCloudfront(this, "MyCloudfront", {
    //   resumesBucket: myBuckets.resumesBucket,
    // });

    const apigws = new ApiGateways(this, "ApiGateways", {
      createNeo4jLambdaForPostJob: myLambdas.neo4jLambdaForPostjob,
      createNeo4jLambdaForSearchByParameter:
        myLambdas.neo4jLambdaForSearchByParameter,
      createNeo4jLambdaForReferralSubmit:
        myLambdas.neo4jLambdaForReferralSubmit,
      extjobApiIamRole: iamroles.apiAccessStepfnRole,
      resumesBucket: myBuckets.resumesBucket,
      resumesUploadLambda: myLambdas.uploadFileToS3,
    });
  }
}
