export default async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '676767';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = 'BigChungus-67';
  const GITHUB_REPO = 'calendar-dashboard';
  const GITHUB_FILE = 'events.json';
  const GITHUB_BRANCH = 'master';

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, action, event: eventData, eventId } = req.body;

  // Validate password
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // Get current file
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      { headers }
    );
    if (!getRes.ok) throw new Error(`GitHub GET error: ${getRes.status}`);
    const file = await getRes.json();
    const currentEvents = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));

    let updatedEvents;
    if (action === 'add') {
      updatedEvents = [...currentEvents, eventData];
    } else if (action === 'delete') {
      updatedEvents = currentEvents.filter(e => e.id !== eventId);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update file
    const content = Buffer.from(JSON.stringify(updatedEvents, null, 2) + '\n').toString('base64');
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ message: `Update events`, content, sha: file.sha, branch: GITHUB_BRANCH }),
      }
    );
    if (!putRes.ok) throw new Error(`GitHub PUT error: ${putRes.status}`);

    return res.status(200).json({ success: true, events: updatedEvents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
