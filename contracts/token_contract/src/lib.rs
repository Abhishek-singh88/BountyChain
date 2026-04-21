#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttrait, contracttype, Address, Env,
};

#[cfg(test)]
extern crate std;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
enum DataKey {
    Admin,
    Balance(Address),
}

fn balance_key(user: &Address) -> DataKey {
    DataKey::Balance(user.clone())
}

fn read_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("token contract is not initialized")
}

fn read_balance(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&balance_key(user))
        .unwrap_or(0)
}

fn write_balance(env: &Env, user: &Address, amount: i128) {
    if amount == 0 {
        env.storage().persistent().remove(&balance_key(user));
    } else {
        env.storage()
            .persistent()
            .set(&balance_key(user), &amount);
    }
}

fn add_balance(env: &Env, user: &Address, amount: i128) {
    let next = read_balance(env, user) + amount;
    write_balance(env, user, next);
}

fn sub_balance(env: &Env, user: &Address, amount: i128) {
    let current = read_balance(env, user);
    if current < amount {
        panic!("insufficient balance");
    }
    write_balance(env, user, current - amount);
}

#[contracttrait]
pub trait TokenInterface {
    fn mint(env: &Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let admin = read_admin(env);
        admin.require_auth();
        add_balance(env, &to, amount);
    }

    fn transfer(env: &Env, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        from.require_auth();
        sub_balance(env, &from, amount);
        add_balance(env, &to, amount);
    }

    fn balance_of(env: &Env, user: Address) -> i128 {
        read_balance(env, &user)
    }
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn __constructor(env: &Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("token contract already initialized");
        }

        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }
}

#[contractimpl(contracttrait)]
impl TokenInterface for TokenContract {}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn mint_and_transfer_work() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(TokenContract, (admin.clone(),));
        let client = TokenInterfaceClient::new(&env, &contract_id);

        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &100);
        assert_eq!(client.balance_of(&alice), 100);

        client.transfer(&alice, &bob, &40);

        assert_eq!(client.balance_of(&alice), 60);
        assert_eq!(client.balance_of(&bob), 40);
    }
}
