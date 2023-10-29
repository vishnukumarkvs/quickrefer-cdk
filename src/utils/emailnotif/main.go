package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type UserData struct {
	Fullname     string `json:"fullname"`
	Email        string `json:"email"`
	RequestCount int    `json:"requestCount"`
	SeenCount    int    `json:"seenCount"` // New field for DynamoDB data
}

func fetchFromDynamoDB(tableName, indexName, conditionExpression string, expressionAttributeValues map[string]types.AttributeValue) ([]UserData, error) {
	region := os.Getenv("REGION")
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		return nil, err
	}

	client := dynamodb.NewFromConfig(cfg)
	input := &dynamodb.QueryInput{
		TableName:                 &tableName,
		IndexName:                 &indexName,
		KeyConditionExpression:    &conditionExpression,
		ExpressionAttributeValues: expressionAttributeValues,
	}

	resp, err := client.Query(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	var users []UserData
	for _, item := range resp.Items {
		var user UserData
		err := attributevalue.UnmarshalMap(item, &user)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func fetchFromNeo4j(uri, username, password string) ([]UserData, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
	if err != nil {
		return nil, err
	}
	defer driver.Close(context.Background())

	session := driver.NewSession(context.Background(), neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(context.Background())

	result, err := session.Run(context.Background(), "MATCH (a)-[:SENT_FRIEND_REQUEST]->(b) WITH b, COUNT(a) AS requestCount RETURN b.fullname, b.email, requestCount", nil)
	if err != nil {
		return nil, err
	}

	var users []UserData
	for result.Next(context.Background()) {
		record := result.Record()

		if fullnameVal, exists := record.Get("b.fullname"); exists {
			if emailVal, emailExists := record.Get("b.email"); emailExists {
				if requestCountVal, requestCountExists := record.Get("requestCount"); requestCountExists {
					user := UserData{
						Fullname:     fullnameVal.(string),
						Email:        emailVal.(string),
						RequestCount: int(requestCountVal.(int64)),
					}
					users = append(users, user)
				}
			}
		}
	}
	if err = result.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func mergeData(neo4jData, dynamoData []UserData) map[string]UserData {
	mergedData := make(map[string]UserData)

	for _, user := range neo4jData {
		mergedData[user.Email] = user
	}

	for _, user := range dynamoData {
		if existingUser, exists := mergedData[user.Email]; exists {
			existingUser.SeenCount += user.SeenCount
			mergedData[user.Email] = existingUser
		} else {
			mergedData[user.Email] = user
		}
	}

	return mergedData
}

type Response struct {
	Message string `json:"message"`
}

func handler(ctx context.Context) (Response, error) {
	// DynamoDB
	tableName := os.Getenv("DDB_TABLE_NAME")
	indexName := "seenStatus-index"
	conditionExpression := "seenStatus = :statusValue"
	expressionAttributeValues := map[string]types.AttributeValue{
		":statusValue": &types.AttributeValueMemberN{Value: "0"},
	}

	dynamoData, err := fetchFromDynamoDB(tableName, indexName, conditionExpression, expressionAttributeValues)
	if err != nil {
		log.Fatalf("Error querying DynamoDB: %v", err)
	}

	// Neo4j
	uri := os.Getenv("URI")
	username := os.Getenv("USER")
	password := os.Getenv("PASSWORD")

	neo4jData, err := fetchFromNeo4j(uri, username, password)
	if err != nil {
		log.Fatalf("Error querying Neo4j: %v", err)
	}

	// Merging data
	mergedData := mergeData(neo4jData, dynamoData)

	// Display merged data
	for _, user := range mergedData {
		fmt.Printf("Fullname: %s, Email: %s, RequestCount: %d, SeenCount: %d\n", user.Fullname, user.Email, user.RequestCount, user.SeenCount)
	}
	return Response{Message: "successful"}, nil

}

func main() {
	lambda.Start(handler)
}
