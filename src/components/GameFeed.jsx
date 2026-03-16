export default function GameFeed({ feed }) {
  return (
    <div className="card">
      <h2 className="title">Live Feed</h2>
      <div className="feed">
        {feed.length === 0 && <p className="subtitle">No chaos yet.</p>}
        {feed.slice().reverse().map((item, index) => (
          <div key={`${item}-${index}`} className="feed-item">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
