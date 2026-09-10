# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component       | Backend endpoints                      | Database SQL                                                                          |
| --------------------------------------------------- | ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------- |
| View home page                                      | home.tsx                 | none                                   | none                                                                                  |
| Register new user<br/>(t@jwt.com, pw: test)         | register.tsx             | authRouter.js POST /api/auth           | `INSERT INTO userRole (userId, role, objectId) VALUES (?, ?, ?)`                      |
| Login new user<br/>(t@jwt.com, pw: test)            | login.tsx                | authRouter.js PUT /api/auth            | `INSERT INTO auth (token, userId) VALUES (?, ?) ON DUPLICATE KEY UPDATE token=token`, |
| Order pizza                                         | menu.tsx and payment.tsx | GET api/order/menu and POST /api/order |                                                                                       |
| Verify pizza                                        | delivery.tsx             |                                        |                                                                                       |
| View profile page                                   | dinerDashboard.tsx       |                                        |                                                                                       |
| View franchise<br/>(as diner)                       | franchiseDashboard.tsx   |                                        |                                                                                       |
| Logout                                              | logout.tsx               | authRouter.js DELETE /api/auth         | `DELETE FROM auth WHERE token=?`                                                      |
| View About page                                     | about.tsx                |                                        |                                                                                       |
| View History page                                   | history.tsx              |                                        |                                                                                       |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) | login.tsx                |                                        |                                                                                       |
| View franchise<br/>(as franchisee)                  | franchiseDashboard.tsx   |                                        |                                                                                       |
| Create a store                                      | createStore.tsx          |                                        |                                                                                       |
| Close a store                                       | closeStore.tsx           |                                        |                                                                                       |
| Login as admin<br/>(a@jwt.com, pw: admin)           | login.tsx                |                                        |                                                                                       |
| View Admin page                                     | adminDashboard.tsx       |                                        |                                                                                       |
| Create a franchise for t@jwt.com                    | createFranchise.tsx      |                                        |                                                                                       |
| Close the franchise for t@jwt.com                   | closeFranchise.tsx       |                                        |                                                                                       |
