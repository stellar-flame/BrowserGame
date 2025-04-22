export enum ItemType {
    Potion = 'Potion',
    Powerup = 'Powerup'
}

export const ItemTypeConfig = {
    [ItemType.Potion]: {
        healAmount: 20
    },
    [ItemType.Powerup]: {
        speedBoostAmount: 1.5,
        duration: 5000
    }
}