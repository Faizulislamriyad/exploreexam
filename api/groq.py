# api/groq.py - Groq API Proxy for Vercel Serverless Function

import os
import json
import urllib.request
import urllib.error

def handler(request):
    """
    Vercel Python Serverless Function handler.
    Receives POST requests from frontend, forwards to Groq API.
    """
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': headers
        }

    # Only POST allowed
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed. Use POST.'})
        }

    try:
        # Parse request body
        body = json.loads(request.body)
        messages = body.get('messages')
        model = body.get('model', 'openai/gpt-oss-120b')
        temperature = body.get('temperature', 0.7)
        max_tokens = body.get('max_tokens', 350)

        if not messages:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Messages field is required'})
            }

        # ✅ Read API key from Vercel Environment Variable (SECURE)
        GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
        if not GROQ_API_KEY:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'GROQ_API_KEY not configured on server.'})
            }

        # Prepare Groq API request
        groq_url = 'https://api.groq.com/openai/v1/chat/completions'
        groq_headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        groq_body = json.dumps({
            'model': model,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens,
            'top_p': 0.9
        }).encode('utf-8')

        # Send request to Groq
        req = urllib.request.Request(groq_url, data=groq_body, headers=groq_headers, method='POST')
        
        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            reply = response_data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'reply': reply})
            }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'Groq API HTTP Error: {e.code} - {error_body}')
        return {
            'statusCode': e.code,
            'headers': headers,
            'body': json.dumps({'error': f'Groq API error: {error_body}'})
        }
    except Exception as e:
        print(f'Server Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
