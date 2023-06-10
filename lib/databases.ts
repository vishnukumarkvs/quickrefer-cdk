import { RemovalPolicy } from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ITable,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class MyDatabases extends Construct {
  public readonly authTable: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.authTable = this.createAuthTable();
  }

  private createAuthTable(): ITable {
    const authTable = new Table(this, `NextAuthTable`, {
      tableName: "next-auth",
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      timeToLiveAttribute: "expires",
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    authTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: AttributeType.STRING },
    });

    return authTable;
  }
}
