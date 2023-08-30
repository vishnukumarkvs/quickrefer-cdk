import {
  CloudFrontToS3,
  CloudFrontToS3Props,
} from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { Bucket } from "aws-cdk-lib/aws-s3";

dotenv.config();

interface CloudfrontProps {
  resumesBucket: Bucket;
}

export class MyCloudfrontS3 extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    const cloudfrontToS3Props: CloudFrontToS3Props = {
      existingBucketObj: props.resumesBucket,
    };

    new CloudFrontToS3(this, "ResumeDistribution2", cloudfrontToS3Props);
  }
}
