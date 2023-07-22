import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface IamProps {
  stateMachineArn: string;
}

export class IamStack extends Construct {
  readonly apiAccessStepfnRole: iam.Role;

  constructor(scope: Construct, id: string, props: IamProps) {
    super(scope, id);

    // Define IAM role for API Gateway
    this.apiAccessStepfnRole = new iam.Role(
      this,
      "ApiGatewayAccessStepfnRole",
      {
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      }
    );

    // Attach inline policy to the IAM role
    this.apiAccessStepfnRole.attachInlinePolicy(
      new iam.Policy(this, "ApiGatewayAccessStepfnPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: ["states:StartExecution"],
            effect: iam.Effect.ALLOW,
            resources: [props.stateMachineArn], // Assuming props.stateMachineArn is provided in the StackProps
          }),
        ],
      })
    );
  }
}
