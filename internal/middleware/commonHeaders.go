package middleware

import (
	"net/http"
	"strings"
)

func CommonHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/swagger/") {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Server", "")
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com")
		w.Header().Set("Referrer-Policy", "origin-when-cross-origin")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "deny")
		w.Header().Set("X-XSS-Protection", "0")
		w.Header().Set("Server", "")

		next.ServeHTTP(w, r)
	})
}
