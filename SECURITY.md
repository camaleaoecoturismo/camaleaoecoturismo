# Security Guidelines - Camaleão Ecoturismo

## Security Measures Implemented

### 1. Authentication & Authorization
- **Role-based access control**: Admin verification for sensitive operations
- **Rate limiting**: Protection against brute force attacks (15 min lockout after multiple failed attempts)
- **Input validation**: Email format, password strength requirements
- **Session management**: Automatic session expiration and proper logout

### 2. XSS Protection
- **HTML sanitization**: All user-generated content sanitized with DOMPurify
- **Content Security Policy**: Strict CSP headers prevent XSS attacks
- **Input limitations**: Maximum length limits on all input fields

### 3. Database Security
- **Row Level Security (RLS)**: All tables protected with appropriate policies
- **Input validation**: Server-side validation for all data
- **Audit logging**: All admin actions logged for security monitoring
- **Data sanitization**: XSS prevention on database triggers

### 4. Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Comprehensive CSP implementation

### 5. Input Validation
- **Maximum lengths**: Prevents DoS attacks through large inputs
- **Type validation**: Email, phone, and other field formats validated
- **Sanitization**: HTML tags and dangerous characters removed

## Configuration Requirements

### Supabase Dashboard Settings
1. **Authentication > Settings**:
   - Set OTP expiry to 10 minutes
   - Enable leaked password protection
   
2. **Authentication > URL Configuration**:
   - Configure correct Site URL and Redirect URLs

### Deployment Security
1. **Environment Variables**: Never expose sensitive keys in client code
2. **HTTPS**: Always use HTTPS in production
3. **Domain Configuration**: Properly configure Supabase allowed domains

## Best Practices for Developers

### 1. Content Management
- Never use `dangerouslySetInnerHTML` without sanitization
- Always validate user inputs before processing
- Use prepared statements for database queries

### 2. Authentication
- Implement proper session management
- Always verify user roles before sensitive operations
- Use strong password requirements

### 3. Data Handling
- Sanitize all user-generated content
- Implement proper error handling without exposing sensitive information
- Use audit logging for all admin actions

### 4. Code Quality
- Remove all debugging console.log statements from production
- Implement proper error boundaries
- Use TypeScript for type safety

## Security Monitoring

### Database Functions
- `validate_auth_attempt()`: Rate limiting for authentication
- `audit_changes()`: Logs all data modifications
- `validate_cliente_data()`: Input validation and sanitization

### Alerts to Monitor
- Multiple failed login attempts
- Unusual admin activity patterns
- Database errors or suspicious queries
- CSP violations

## Incident Response

1. **Authentication Issues**: Check rate limiting logs in audit_logs table
2. **XSS Attempts**: Monitor CSP violation reports
3. **Data Breaches**: Review audit_logs for unauthorized access
4. **Performance Issues**: Check for potential DoS attacks

## Regular Security Tasks

- [ ] Review user roles and permissions monthly
- [ ] Update dependencies regularly
- [ ] Monitor Supabase security alerts
- [ ] Review audit logs for suspicious activity
- [ ] Test backup and recovery procedures

## Contact

For security concerns or incident reporting, contact the development team immediately.