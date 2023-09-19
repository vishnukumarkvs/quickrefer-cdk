import {
  CloudFrontToS3,
  CloudFrontToS3Props,
} from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { LambdaEdgeEventType, PriceClass } from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as lambda from "aws-cdk-lib/aws-lambda";
dotenv.config();

interface CloudfrontProps {
  resumesBucket: Bucket;
}

export class MyCloudfrontS3 extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    const RefererFunction = new cloudfront.Function(this, "RefereFunction", {
      code: cloudfront.FunctionCode.fromInline(`
          function handler(event) {
            var request = event.request;
            var headers = request.headers;
            var referer = headers['referer'];
            // Check if the referer header is present and matches the expected value
            if (referer.value.includes('jt-frontend.vercel.app')) {
              // Allow the request to proceed
              // console.log(referer.value); // Viewable in cloudfront logs
              return request;
            } else {
              // Return a 403 Forbidden response
              var response = {
                statusCode: 403,
                statusDescription: 'Forbidden',
                body: 'Access Denied'
              };
              return response;
            }
          }
      `),
    });

    const cloudfrontToS3Props: CloudFrontToS3Props = {
      existingBucketObj: props.resumesBucket,
      cloudFrontDistributionProps: {
        defaultBehavior: {
          origin: new origins.S3Origin(props.resumesBucket),
          functionAssociations: [
            {
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
              function: RefererFunction,
            },
          ],
        },
        priceClass: PriceClass.PRICE_CLASS_200,
      },
    };

    new CloudFrontToS3(this, "ResumeDistribution3", cloudfrontToS3Props);
  }
}
