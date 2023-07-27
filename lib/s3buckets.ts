import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { RemovalPolicy } from "aws-cdk-lib";

dotenv.config();

export class MyBuckets extends Construct {
  readonly resumesBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.resumesBucket = new s3.Bucket(scope, "ResumeBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      // TODO: Change this to RETAIN if you want to keep the bucket after stack deletion
      removalPolicy: RemovalPolicy.DESTROY,
      bucketName: process.env.BUCKET_NAME as string,
    });
  }
}
