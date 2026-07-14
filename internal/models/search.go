package models

type SearchResult struct {
	Type     string `json:"type"`
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	URL      string `json:"url"`
}
