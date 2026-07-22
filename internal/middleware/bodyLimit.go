package middleware

import "net/http"

func LimitBodySize(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limit := 1024 * 1024
		if r.URL.Path == "/api/upload" {
			limit = 15 * 1024 * 1024
		}
		r.Body = http.MaxBytesReader(w, r.Body, int64(limit))
		next.ServeHTTP(w, r)
	})
}
