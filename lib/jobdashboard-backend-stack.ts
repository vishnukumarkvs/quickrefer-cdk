import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MyDatabases } from "./databases";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class JobdashboardBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new MyDatabases(this, "Database");
  }
}
