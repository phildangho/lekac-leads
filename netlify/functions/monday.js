// netlify/functions/monday.js
// Minimal version — creates item in correct group, no column values
// Column values will be added once exact labels are confirmed
 
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
 
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
 
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'MONDAY_API_TOKEN not set in Netlify environment variables.' })
    };
  }
 
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
 
  // createLead action — create item in correct group with name only
  if (body.action === 'createLead') {
    const { boardId, groupId, itemName, phone } = body;
 
    // Build column values carefully — only include phone for now
    // Status and Type will be added manually on the board until labels are confirmed
    const columnValues = {};
 
    // Only add phone if it exists and is valid
    if (phone && phone.trim()) {
      columnValues['phone_mkxn7m65'] = {
        phone: phone.trim(),
        countryShortName: 'CA'
      };
    }
 
    const mutation = `
      mutation($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
          name
        }
      }
    `;
 
    try {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'API-Version': '2024-01'
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            boardId,
            groupId,
            itemName,
            columnValues: JSON.stringify(columnValues)
          }
        })
      });
 
      const data = await response.json();
 
      if (data.errors) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: data.errors[0]?.message || 'Monday API error' })
        };
      }
 
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
      };
 
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Monday.com API request failed', detail: e.message })
      };
    }
  }
 
  // Generic GraphQL passthrough for all other queries
  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'API-Version': '2024-01'
      },
      body: JSON.stringify(body)
    });
 
    const data = await response.json();
 
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
 
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Monday.com API request failed', detail: e.message })
    };
  }
};
 
