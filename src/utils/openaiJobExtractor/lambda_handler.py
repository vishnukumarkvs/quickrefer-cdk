import os
import json
import openai
from datetime import datetime, timedelta

openai.api_key = os.getenv("OPENAI_API_KEY")

function_descriptions = [
    {
        "name": "get_job_info",
        "description": "Get Job Poster, Job Title, and Job Description, Job Location, Technical Skills from the data",
        "parameters": {
            "type": "object",
            "properties": {
                "job_poster": {
                    "type": "string",
                    "description": "The job poster, e.g. Amazon",
                },
                "job_title": {
                    "type": "string",
                    "description": "The Title of Job e.g. Software Engineer",
                },
                "job_description": {
                    "type": "string",
                    "description": "The Job Description",
                },
                "job_location": {
                    "type": "string",
                    "description": "The Job Location eg: Seattle, WA",
                },
                "technical_skills": {
                    "type": "string",
                    "description": "The Technical Skills required for the job. eg: Python, Java, C++",
                },
            },
            "required": ["job_poster", "job_title", "job_description", "job_location", "technical_skills"],
        },
    }
]

def lambda_handler(event, context):
    print(event)
    response_body = event['body']
    response_data = json.loads(response_body)
    user_prompt = response_data['result']
    print(user_prompt)
    
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-0613",
        messages=[{"role": "user", "content": user_prompt}],
        # Add function calling
        functions=function_descriptions,
        function_call="auto",  # specify the function call
    )

    print(completion)
    
    output = completion.choices[0].message['content']
    print(output)
    
    return {
        'statusCode': 200,
        'body': output
    }
