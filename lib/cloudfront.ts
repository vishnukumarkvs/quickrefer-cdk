import { Duration } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

dotenv.config();

interface CloudfrontProps {
  resumesBucket: IBucket;
}

export class MyCloudfront extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "ResumeDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: props.resumesBucket,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                compress: true,
                defaultTtl: Duration.days(1),
                maxTtl: Duration.days(1),
                minTtl: Duration.days(1),
              },
            ],
          },
        ],
      }
    );
  }
}
