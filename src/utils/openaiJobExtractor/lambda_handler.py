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
 
    # print("completion")
    # print(completion)


    
    output = completion.choices[0].message


    # print("printing output")
    # print(output)

    job_info_string = output['function_call']['arguments']

    # Parse the JSON string into a dictionary
    job_info = json.loads(job_info_string)

    # Now you can access the fields
    job_poster = job_info['job_poster']
    job_title = job_info['job_title']
    job_description = job_info['job_description']
    job_location = job_info['job_location']
    technical_skills = job_info['technical_skills']

    # Print them out
    # print('Job Poster:', job_poster)
    # print('Job Title:', job_title)
    # print('Job Description:', job_description)
    # print('Job Location:', job_location)
    # print('Technical Skills:', technical_skills)

    job_data = {
    'Job Poster': job_poster,
    'Job Title': job_title,
    'Job Description': job_description,
    'Job Location': job_location,
    'Technical Skills': technical_skills
    }

    # Convert the Python dictionary into a JSON string
    job_data_json = json.dumps(job_data)
    
    return {
        'statusCode': 200,
        'job_data': job_data_json
    }
