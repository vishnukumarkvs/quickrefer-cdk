import {
  CloudFrontToS3,
  CloudFrontToS3Props,
} from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { PriceClass } from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Stack } from "aws-cdk-lib";
dotenv.config();

interface CloudfrontProps {
  resumesBucket: Bucket;
}

export class MyCloudfrontS3 extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    let allowedReferers = ["jt-frontend.vercel.app", "quickrefer.in"];

    const allowedReferersCheck = allowedReferers
      .map((domain) => `referer.value.includes('${domain}')`)
      .join(" || ");

    const RefererFunction = new cloudfront.Function(this, "RefereFunction", {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var headers = request.headers;
          var referer = headers['referer'];
          
          if (${allowedReferersCheck}) {
            console.log(referer, "success");
            return request;
          } else {
            console.log(referer, "failure");
            var response = {
              statusCode: 403,
              statusDescription: 'Forbidden',
              body: 'Access is Denied.'
            };
            return response;
          }
        }
      `),
    });

    // View Response Cloudfront function for security.
    // some policies conflicting
    // const cspFunction = new cloudfront.Function(this, "CSPFunction", {
    //   code: cloudfront.FunctionCode.fromInline(`
    //     function handler(event) {
    //       var response = event.response;
    //       var headers = response.headers;

    //       headers['strict-transport-security'] = { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubdomains; preload' };
    //       headers['content-security-policy'] = { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors https://jt-frontend.vercel.app/" };
    //       headers['x-content-type-options'] = { key: 'X-Content-Type-Options', value: 'nosniff' };
    //       headers['x-xss-protection'] = { key: 'X-XSS-Protection', value: '1; mode=block' };

    //       return response;
    //     }
    //   `),
    // });

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
    const env = this.node.tryGetContext("env");
    const stackEnv = this.node.tryGetContext(env).ENVNAME;
    new CloudFrontToS3(
      this,
      `ResumeDistribution${stackEnv}`,
      cloudfrontToS3Props
    );
  }
}
