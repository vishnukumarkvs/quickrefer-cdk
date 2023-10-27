package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// Define a struct to represent the data.
type UserData struct {
	Fullname     string `json:"fullname"`
	Email        string `json:"email"`
	RequestCount int    `json:"requestCount"`
}

// Handler is the AWS Lambda function handler.
func Handler(ctx context.Context) {
	uri := os.Getenv("URI")
	username := os.Getenv("USER")
	password := os.Getenv("PASSWORD")

	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
	if err != nil {
		log.Fatal("Not able to connect to Neo4j", err)
	}
	defer driver.Close(ctx)

	// Create a Neo4j session.
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Run the Neo4j query.
	result, err := session.Run(ctx, "MATCH (a)-[:SENT_FRIEND_REQUEST]->(b) WITH b, COUNT(a) AS requestCount RETURN b.fullname, b.email, requestCount", nil)
	if err != nil {
		log.Fatal("Not able to run query in Neo4j", err)
	}

	// Define a slice to store the results.
	var users []UserData

	// Iterate through the query results and populate the slice of structs.
	for result.Next(ctx) {
		record := result.Record()

		// Check if "b.fullname" exists in the record.
		if fullnameVal, exists := record.Get("b.fullname"); exists {
			// Check if "b.email" exists in the record.
			if emailVal, emailExists := record.Get("b.email"); emailExists {
				// Check if "requestCount" exists in the record.
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

	// Check for any errors during iteration.
	if err = result.Err(); err != nil {
		log.Fatal(err)
	}

	if len(users) > 0 {
		fmt.Println("Email:", users[0].Email)
		fmt.Println("Fullname:", users[0].Fullname)
		fmt.Println("RequestCount:", users[0].RequestCount)
	} else {
		fmt.Println("No users found")
	}
}

func main() {
	// Start the Lambda function.
	lambda.Start(Handler)
}
