Features I need for orders:

Task 1: Creating Orders Page:

Route: src/app/orders/new.tsx will be the page to create new orders. Use the following details we already have in the new.tsx file to create the new order.
Details:
 - With all those field user can add a new order on clicking the check icon
 - Let the owner of the business create an order with paying immediately button that will create the order and mark it as paid. It will also show the order details page after creating the order.
 - If pay immediately button is clicked, Payment status will be marked as paid and order status will be marked as completed. If pay immediately button is not clicked, Payment status will be marked as unpaid and order status will be marked as active, see the database enum.


Task 2: Canceling orders:
- Cancel is only possible if the order has no transactions  and on Clicking cancel it'll show the confirmation pop up using the AlertDialog component. On confirm, Items will be added back to the inventory and order status will be marked as cancelled. Total amount of that order will be 0 and due amount will also be 0. If there are any transactions it can't be cancelled, meaning there will be no cancel button on the order details page rather there will be a refund button which will show the refund pop up and on confirming there will be refund modal and more about it in Task 3

Task 3: Refunding orders:
- Refund button will always be shown in order details page whether it has transactions or not.
- On refund button there will be refund modal and in that modal we'll show all the product they bought in that the same order we showd the item list on order details page. and there will be two thing to do about it each item will have total amount they bought which is static and how many they want to return with a counter and also what will be the refund unit price with an input component and then the total of that items refund will be shown on the right side, it should be shown for all the items. Make sure to show the original price of that item for reference. Then the total refund will be calculated at the bottom of the modal and there will be a confirm button to confirm the refund. On confirming the refund, new order items will be created with negative qty and the total amount of that order will be changed with (prev total amount - refund amount) and due amount should be calculated too with this (new total amount - paid amount from transactions) and profit will be calculated too with (new total amount - cost price). remember each refund won't change previous order items but create new items that will have negative qty and a diff unit price to show how much refund happend and that total refund will be deducted from previous total amount.
- There will be a full refund option in the refund modal which will automatically fill the counter with total qty of that item and refund unit price with the original price(in an input box so they can have custom refund price per unit) of that item and total refund will be calculated accordingly. On confirming the full refund, same thing will happen as mentioned above but all items will be refunded with original price and total amount will be deducted with the original total amount of that order. if full refund happen then the discount won't be applied to that order and total amount will be calculated without discount. Recalculate due and total profit accordingly.
- If user already paid partially and want full refund then the calculate due with total amount after refund - paid amount from transactions and if user have due negative then show that amount as customer owe to the business.

Task 4: Editing orders:
- User can edit the orders it's qty and price and transactions, and it should affect the discounts, total , profit, due amounts accordingly. So it will be flexible for users to edit anything, order items should be shown with counter to edit them and input to edit them.


Task 5: Displaying products:

Route: src/app/orders/[customerId].tsx will show list of customer names on clicking the customer name, it will show the orders of that customer. on customer name clicks it will open that customer orders in src/app/orders/customerOrders/[customerId]/[customerId].tsx file.

Details:
   - In src/app/orders/customerOrders/[customerId]/[customerId].tsx file, we will show the list of orders for that customer. On clicking any order it will show the details of that order in src/app/orders/[id].tsx file
   - In src/app/orders/[id].tsx file, we will show the details of that order. It will have a button to go back to the customer orders page.
   - In src/app/orders/[customerId].tsx file, we will show the list of customer names. On clicking the customer name, it will navigate to src/app/orders/customerOrders/[customerId]/[customerId].tsx file and show the orders of that customer.
   - In src/app/orders/[id].tsx file, we will show the details of that order. It will have following details:
       - Customer Circular logo with first letter from the name, Customer Name, Date and payment status on the right side of the card
       - List of items in that order with name, quantity and price and total for that item in right side of the item.
       - Show total amount from the total_amount field in the order details.
       - Show total due from the due_amount field in the order details.
       - Show total profit from the profit field in the order details.
       - All the transactions related to that order with date, amount and type of transaction (payment or refund) in the bottom of the page.




Conclusion: It's a almost complete order management system with refund and all can be edited. on each refund always create new order items with negative qty and update prev amount - refund amount and then deduct discount if there are any. no discount if it's full refund. then total due and profit accordingly. cancel order only if there is no transactions and on cancel add items back to inventory.

Hint: You might need to redesign a little bit, creating new pages for customers orders page and new modals for refund and edit orders. Make sure to show total due from all orders in the customer orders list page before the order list and also show total profit from that user in the customer orders list page.
