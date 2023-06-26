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
  public readonly utilsTable: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.authTable = this.createAuthTable();
    this.utilsTable = this.createUtilsTable();
  }

  private createAuthTable(): ITable {
    const authTable = new Table(this, "JtUsersTable", {
      tableName: "Users",
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

    authTable.addGlobalSecondaryIndex({
      indexName: "jtusername-index",
      partitionKey: { name: "jtusername", type: AttributeType.STRING },
      // uncomment below line if you want to add sort key
      // sortKey: { name: "someSortKey", type: AttributeType.STRING },
    });

    return authTable;
  }

  private createUtilsTable(): ITable {
    const utilsTable = new Table(this, `UtilsTable`, {
      tableName: "Utils",
      partitionKey: { name: "pk", type: AttributeType.STRING },
      timeToLiveAttribute: "expires",
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    return utilsTable;
  }
}
