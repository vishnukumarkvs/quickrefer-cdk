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
  public readonly qrActiveConnectionsTable: ITable;
  public readonly qrChatMessages: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.authTable = this.createAuthTable();
    this.qrActiveConnectionsTable = this.createActiveConnectionsTable();
    this.qrChatMessages = this.createChatMessagesTable();
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

  private createActiveConnectionsTable(): ITable {
    const activeConnectionsTable = new Table(this, "QrActiveConnectionsTable", {
      tableName: "QrActiveConnections1",
      partitionKey: {
        name: "userId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "connectionKey",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST, // Use provisioned if you want provisioned throughput
      removalPolicy: RemovalPolicy.DESTROY,
    });

    activeConnectionsTable.addGlobalSecondaryIndex({
      indexName: "connectionId-index",
      partitionKey: {
        name: "connectionId",
        type: AttributeType.STRING,
      },
    });

    return activeConnectionsTable;
  }

  private createChatMessagesTable(): ITable {
    const chatMessagesTable = new Table(this, "QrChatMessagesTable", {
      tableName: "QrChatMessages1",
      partitionKey: {
        name: "chatId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: AttributeType.NUMBER,
      },
      billingMode: BillingMode.PAY_PER_REQUEST, // Use provisioned if you want provisioned throughput
      removalPolicy: RemovalPolicy.DESTROY,
    });
    chatMessagesTable.addGlobalSecondaryIndex({
      indexName: "RecipientIndex",
      partitionKey: {
        name: "recipientId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: AttributeType.NUMBER,
      },
    });
    return chatMessagesTable;
  }
}
