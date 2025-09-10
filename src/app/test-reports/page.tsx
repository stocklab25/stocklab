'use client';

import Layout from '@/components/Layout';
import ReportsAPITest from '@/components/ReportsAPITest';

export default function TestReportsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports API Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the new reports API and view detailed logging in the console
          </p>
        </div>
        
        <ReportsAPITest />
      </div>
    </Layout>
  );
}
